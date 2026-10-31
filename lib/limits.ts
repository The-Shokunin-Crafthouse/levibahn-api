// Cap enforcement. Pure logic over a CounterStore so it is testable without Redis.

import { CAPS } from './caps.js';
import type { CounterStore } from './store.js';

export type LimitVerdict =
  | { ok: true; remainingForVisitor: number }
  | { ok: false; reason: 'visitor' | 'ip' | 'site'; remainingForVisitor: 0 };

const DAY_SECONDS = 60 * 60 * 24;

export function utcDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function keys(visitorId: string, ip: string, day = utcDayKey()) {
  return {
    visitor: `chat:v:${day}:${visitorId}`,
    ip: `chat:ip:${day}:${ip}`,
    site: `chat:site:${day}`,
  };
}

/**
 * Reserve one question. Increments all three counters, then refunds them if any
 * cap is exceeded, so a refused request never consumes budget.
 */
export async function reserve(
  store: CounterStore,
  visitorId: string,
  ip: string,
  now = new Date(),
): Promise<LimitVerdict> {
  const k = keys(visitorId, ip, utcDayKey(now));
  const [v, i, s] = await Promise.all([
    store.incr(k.visitor, DAY_SECONDS),
    store.incr(k.ip, DAY_SECONDS),
    store.incr(k.site, DAY_SECONDS),
  ]);
  const over: 'visitor' | 'ip' | 'site' | null =
    v > CAPS.perVisitorPerDay ? 'visitor' : i > CAPS.perIpPerDay ? 'ip' : s > CAPS.sitePerDay ? 'site' : null;
  if (over) {
    await Promise.all([store.decr(k.visitor), store.decr(k.ip), store.decr(k.site)]);
    return { ok: false, reason: over, remainingForVisitor: 0 };
  }
  return { ok: true, remainingForVisitor: CAPS.perVisitorPerDay - v };
}

/** Questions one IP may start per minute. Not a daily cap: office networks share an IP (spec 60 §6, §10). */
export const BURST_PER_IP_PER_MINUTE = 3;

/** True when this IP may ask now. Every attempt counts, so a script hammering the endpoint stays shut out. */
export async function burst(store: CounterStore, ip: string, now = new Date()): Promise<boolean> {
  const minute = now.toISOString().slice(0, 16);
  return (await store.incr(`chat:burst:${minute}:${ip}`, 60)) <= BURST_PER_IP_PER_MINUTE;
}

/** Give the question back when the model call itself fails. */
export async function refund(store: CounterStore, visitorId: string, ip: string, now = new Date()) {
  const k = keys(visitorId, ip, utcDayKey(now));
  await Promise.all([store.decr(k.visitor), store.decr(k.ip), store.decr(k.site)]);
}
