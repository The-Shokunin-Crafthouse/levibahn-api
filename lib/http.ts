// Shared request plumbing: CORS, visitor identity, JSON replies.

const DEFAULT_ORIGINS = ['https://levibahn.com', 'https://www.levibahn.com', 'http://localhost:3000'];

export function allowedOrigins(): string[] {
  const extra = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') ?? '';
  const allowed = allowedOrigins().includes(origin) ? origin : allowedOrigins()[0];
  return {
    'access-control-allow-origin': allowed,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-visitor-id',
    'access-control-expose-headers': 'x-chat-remaining',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

/** True when the request's Origin is on the allowlist. A missing Origin is not. */
export function originAllowed(request: Request): boolean {
  return allowedOrigins().includes(request.headers.get('origin') ?? '');
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function json(request: Request, body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(request), ...extra },
  });
}

/** Client IP as Vercel reports it. */
export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for') ?? '';
  return xff.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

const VISITOR_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** The browser-generated visitor id. Rejected if malformed, so a key can't be spoofed into something odd. */
export function visitorId(request: Request): string | null {
  const v = request.headers.get('x-visitor-id') ?? '';
  return VISITOR_RE.test(v) ? v : null;
}
