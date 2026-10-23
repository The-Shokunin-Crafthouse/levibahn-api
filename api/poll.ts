// The notification screen's guess: "how many psychology principles are used on this site?"
// GET  /api/poll            -> { options: [{ value, count, percent }], total, voted: value|null }
// POST /api/poll { value }  -> same shape after recording one vote per visitor.
//
// Options are fixed here; the correct answer lives in the site copy, not here.

import { json, preflight, visitorId } from '../lib/http.js';
import { getStore } from '../lib/store.js';

export const POLL_OPTIONS = [6, 13, 21] as const;
type Option = (typeof POLL_OPTIONS)[number];

function isOption(v: unknown): v is Option {
  return typeof v === 'number' && (POLL_OPTIONS as readonly number[]).includes(v);
}

async function tally() {
  const store = getStore();
  const counts = await Promise.all(POLL_OPTIONS.map((o) => store.get(`poll:principles:${o}`)));
  const total = counts.reduce((a, b) => a + b, 0);
  return {
    total,
    options: POLL_OPTIONS.map((value, i) => ({
      value,
      count: counts[i],
      percent: total === 0 ? 0 : Math.round((counts[i] / total) * 100),
    })),
  };
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return preflight(request);

  if (request.method === 'GET') {
    return json(request, { ...(await tally()), voted: null }, 200, { 'cache-control': 'no-store' });
  }

  if (request.method !== 'POST') return json(request, { error: 'method' }, 405);

  const vid = visitorId(request);
  if (!vid) return json(request, { error: 'visitor-id' }, 400);

  let value: unknown;
  try {
    value = ((await request.json()) as { value?: unknown }).value;
  } catch {
    return json(request, { error: 'bad-json' }, 400);
  }
  if (!isOption(value)) return json(request, { error: 'option', options: POLL_OPTIONS }, 400);

  const store = getStore();
  // One vote per visitor id. No IP backstop: a hiring team in one office shares an IP.
  const fresh = await store.sadd('poll:principles:voters', vid);
  if (fresh) await store.incr(`poll:principles:${value}`, 60 * 60 * 24 * 365);

  return json(request, { ...(await tally()), voted: value }, 200, { 'cache-control': 'no-store' });
}
