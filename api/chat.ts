// POST /api/chat  { question: string, hp_7f?: string }
// Streams the answer as plain text. Header x-chat-remaining carries the visitor's
// remaining questions for the day. 429 with { reason, message } when a cap or the
// burst limit is hit. 403 for an Origin outside the allowlist.
//
// The Anthropic key is read from the environment and never logged or echoed.

import Anthropic from '@anthropic-ai/sdk';
import { cleanQuestion } from '../lib/clean.js';
import { clientIp, corsHeaders, json, originAllowed, preflight, visitorId } from '../lib/http.js';
import { burst, refund, reserve } from '../lib/limits.js';
import { adapt } from '../lib/node-adapter.js';
import { chatParams } from '../lib/params.js';
import { getStore, storeIsDurable } from '../lib/store.js';

export const config = { supportsResponseStreaming: true };

export const CAP_MESSAGE: Record<'visitor' | 'ip' | 'site', string> = {
  visitor: "That's the six questions this assistant answers per day. Levi would rather continue in person: use the link below.",
  ip: 'This network has used its questions for today. The link below reaches Levi directly.',
  site: "The site's question budget is spent for today. The link below reaches Levi directly.",
};

/** Too fast, or a filled honeypot. A bot sees the same answer as a fast human (spec 60 §10). */
export const BURST_BODY = { reason: 'burst', message: 'Smartypants needs a moment. Try again in a minute.' } as const;

const INTERRUPTED = '\n\n[The answer was interrupted. Ask again.]';

type StreamEvent = { type: string; delta?: { type: string; text?: string } };
export type StreamParams = Anthropic.MessageStreamParams;
type StreamFactory = (params: StreamParams) => AsyncIterable<StreamEvent>;

let streamFactory: StreamFactory | null = null;

/** Test seam: replace the model call. */
export function __setStreamFactory(f: StreamFactory | null) {
  streamFactory = f;
}

function openStream(params: StreamParams): AsyncIterable<StreamEvent> {
  if (streamFactory) return streamFactory(params);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client.messages.stream(params) as AsyncIterable<StreamEvent>;
}

export async function handler(request: Request): Promise<Response> {
  // A cheap exit for naive scripts; browsers on other sites are already stopped by CORS.
  if (!originAllowed(request)) return json(request, { error: 'origin' }, 403);
  if (request.method === 'OPTIONS') return preflight(request);
  if (request.method !== 'POST') return json(request, { error: 'method' }, 405);

  if (!process.env.ANTHROPIC_API_KEY) return json(request, { error: 'not-configured' }, 503);
  if (process.env.VERCEL_ENV === 'production' && !storeIsDurable()) {
    // Caps are the only thing standing between a visitor and the spend limit.
    return json(request, { error: 'no-store' }, 503);
  }

  const vid = visitorId(request);
  if (!vid) return json(request, { error: 'visitor-id' }, 400);

  let question = '';
  let honeypot = false;
  try {
    const body = (await request.json()) as { question?: unknown; hp_7f?: unknown };
    question = typeof body.question === 'string' ? cleanQuestion(body.question) : '';
    honeypot = body.hp_7f !== undefined && body.hp_7f !== null && body.hp_7f !== '';
  } catch {
    return json(request, { error: 'bad-json' }, 400);
  }
  if (honeypot) return json(request, BURST_BODY, 429);
  if (!question) return json(request, { error: 'empty' }, 400);

  const store = getStore();
  const ip = clientIp(request);
  if (!(await burst(store, ip))) return json(request, BURST_BODY, 429);
  const verdict = await reserve(store, vid, ip);
  if (!verdict.ok) {
    return json(request, { reason: verdict.reason, message: CAP_MESSAGE[verdict.reason] }, 429, {
      'x-chat-remaining': '0',
    });
  }

  const encoder = new TextEncoder();

  let stream: AsyncIterable<StreamEvent>;
  try {
    stream = openStream(chatParams(question));
  } catch {
    await refund(store, vid, ip);
    return json(request, { error: 'upstream' }, 502);
  }

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sent = false;
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) {
            controller.enqueue(encoder.encode(event.delta.text));
            sent = true;
          }
        }
      } catch {
        // Reported in-band: the status line has already gone out.
        controller.enqueue(encoder.encode(INTERRUPTED));
      } finally {
        // No answer byte reached the visitor, so the question does not count (spec 60 §6, §9).
        // Once any text went out, it stays spent.
        if (!sent) await refund(store, vid, ip);
        controller.close();
      }
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-chat-remaining': String(verdict.remainingForVisitor),
      ...corsHeaders(request),
    },
  });
}

export default adapt(handler);
