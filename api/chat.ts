// POST /api/chat  { question: string }
// Streams the answer as plain text. Header x-chat-remaining carries the visitor's
// remaining questions for the day. 429 with { reason } when a cap is hit.
//
// The Anthropic key is read from the environment and never logged or echoed.

import Anthropic from '@anthropic-ai/sdk';
import { CAPS, CHAT_MODEL, MAX_ANSWER_TOKENS } from '../lib/caps.js';
import { clientIp, corsHeaders, json, preflight, visitorId } from '../lib/http.js';
import { refund, reserve } from '../lib/limits.js';
import { SYSTEM_PROMPT } from '../lib/persona.js';
import { getStore, storeIsDurable } from '../lib/store.js';

export const config = { supportsResponseStreaming: true };

const CAP_MESSAGE: Record<'visitor' | 'ip' | 'site', string> = {
  visitor: "That's the six questions this assistant answers per day. Levi would rather continue in person: use the text-me prompt in the corner.",
  ip: 'This network has used its questions for today. The text-me prompt in the corner reaches Levi directly.',
  site: "The site's question budget is spent for today. The text-me prompt in the corner reaches Levi directly.",
};

export default async function handler(request: Request): Promise<Response> {
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
  try {
    const body = (await request.json()) as { question?: unknown };
    question = typeof body.question === 'string' ? body.question.trim() : '';
  } catch {
    return json(request, { error: 'bad-json' }, 400);
  }
  if (!question) return json(request, { error: 'empty' }, 400);
  if (question.length > CAPS.maxQuestionChars) return json(request, { error: 'too-long', max: CAPS.maxQuestionChars }, 413);

  const store = getStore();
  const ip = clientIp(request);
  const verdict = await reserve(store, vid, ip);
  if (!verdict.ok) {
    return json(request, { reason: verdict.reason, message: CAP_MESSAGE[verdict.reason] }, 429, {
      'x-chat-remaining': '0',
    });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();

  let stream: ReturnType<typeof client.messages.stream>;
  try {
    stream = client.messages.stream({
      model: CHAT_MODEL,
      max_tokens: MAX_ANSWER_TOKENS,
      // System prompt first and unchanged per call, so the prompt cache hits (ADR-122, #187, #310).
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: question }],
    });
  } catch {
    await refund(store, vid, ip);
    return json(request, { error: 'upstream' }, 502);
  }

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch {
        // A failure after the first byte is reported in-band; the count stays spent
        // because the model was called. A failure before any byte refunds.
        controller.enqueue(encoder.encode('\n\n[The answer was interrupted. Ask again.]'));
      } finally {
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
