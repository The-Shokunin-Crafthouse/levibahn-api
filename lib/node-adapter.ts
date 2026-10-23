// Vercel may invoke an api/*.ts file either with the web-standard (Request) =>
// Response signature or the Node (req, res) pair. This adapter accepts both so
// the handlers stay written once, against the web standard.

import type { IncomingMessage, ServerResponse } from 'node:http';

export type WebHandler = (request: Request) => Promise<Response>;

function isNodeRes(x: unknown): x is ServerResponse {
  return !!x && typeof (x as ServerResponse).setHeader === 'function';
}

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https';
  const host = (req.headers['x-forwarded-host'] as string) ?? req.headers.host ?? 'localhost';
  const url = `${proto}://${host}${req.url ?? '/'}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) headers.set(k, v.join(', '));
    else if (typeof v === 'string') headers.set(k, v);
  }
  const method = req.method ?? 'GET';
  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    // Vercel pre-parses JSON bodies onto req.body; otherwise read the stream.
    const pre = (req as IncomingMessage & { body?: unknown }).body;
    if (pre !== undefined && pre !== null) body = typeof pre === 'string' ? pre : JSON.stringify(pre);
    else {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
      body = Buffer.concat(chunks).toString('utf8');
    }
  }
  return new Request(url, { method, headers, body });
}

async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((v, k) => res.setHeader(k, v));
  if (!response.body) {
    res.end();
    return;
  }
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
    // Flush each chunk so streaming reaches the browser as it arrives.
    (res as ServerResponse & { flush?: () => void }).flush?.();
  }
  res.end();
}

/** Wrap a web handler so it also works when called as (req, res). */
export function adapt(handler: WebHandler) {
  return async function vercelHandler(reqOrRequest: Request | IncomingMessage, maybeRes?: ServerResponse) {
    if (isNodeRes(maybeRes)) {
      try {
        const response = await handler(await toWebRequest(reqOrRequest as IncomingMessage));
        await sendWebResponse(maybeRes, response);
      } catch (err) {
        maybeRes.statusCode = 500;
        maybeRes.setHeader('content-type', 'application/json');
        maybeRes.end(JSON.stringify({ error: 'handler', detail: err instanceof Error ? err.message : String(err) }));
      }
      return;
    }
    return handler(reqOrRequest as Request);
  };
}
