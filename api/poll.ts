// The notification screen's guess: "how many psychology principles are used on this site?"
// GET  /api/poll            -> { options: [{ value, count, percent }], total, voted: value|null }
// POST /api/poll { value }  -> same shape after recording one vote per visitor.
//
// Options are fixed here; the correct answer lives in the site copy, not here.
// Counts include POLL_SEED (spec 70 §6: the wrong answers get a head start).
// `voted` is the visitor's stored vote (x-visitor-id), on GET and on a repeat POST.

import { json, preflight, visitorId } from '../lib/http.js';
import { adapt } from '../lib/node-adapter.js';
import { getStore } from '../lib/store.js';

export const POLL_OPTIONS = [6, 13, 21] as const;
type Option = (typeof POLL_OPTIONS)[number];

/** Starting counts added to the real ones, so a first visitor sees 31 · 57 · 12. */
export const POLL_SEED: Readonly<Record<Option, number>> = { 6: 31, 13: 57, 21: 12 };

const VOTES = 'poll:principles:votes';

function isOption(v: unknown): v is Option {
  return typeof v === 'number' && (POLL_OPTIONS as readonly number[]).includes(v);
}

async function tally() {
  const store = getStore();
  const counts = await Promise.all(
    POLL_OPTIONS.map(async (o) => POLL_SEED[o] + (await store.get(`poll:principles:${o}`))),
  );
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

async function storedVote(vid: string | null): Promise<Option | null> {
  if (!vid) return null;
  const v = Number(await getStore().hget(VOTES, vid));
  return isOption(v) ? v : null;
}

export async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return preflight(request);

  if (request.method === 'GET') {
    const voted = await storedVote(visitorId(request));
    return json(request, { ...(await tally()), voted }, 200, { 'cache-control': 'no-store' });
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
  // The voters set predates the stored vote; both must be new for a vote to count.
  const fresh = await store.hsetnx(VOTES, vid, String(value));
  const counted = fresh && (await store.sadd('poll:principles:voters', vid));
  if (counted) await store.incr(`poll:principles:${value}`, 60 * 60 * 24 * 365);

  return json(request, { ...(await tally()), voted: (await storedVote(vid)) ?? value }, 200, { 'cache-control': 'no-store' });
}

export default adapt(handler);
