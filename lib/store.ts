// Counter store behind the caps and the poll. Upstash Redis when the two env
// vars exist (production), an in-memory map otherwise (local tests, a preview
// with no store attached). The in-memory map resets on every cold start, so it
// never counts as enforcement; it only keeps the function usable.

import { Redis } from '@upstash/redis';

export interface CounterStore {
  /** Increment `key`, set its expiry to `ttlSeconds` on first write, return the new value. */
  incr(key: string, ttlSeconds: number): Promise<number>;
  /** Decrement `key` (used to refund a count when the upstream call fails). */
  decr(key: string): Promise<number>;
  /** Read a number, 0 when absent. */
  get(key: string): Promise<number>;
  /** Add `member` to set `key`; true if it was new. */
  sadd(key: string, member: string): Promise<boolean>;
}

class MemoryStore implements CounterStore {
  private n = new Map<string, number>();
  private sets = new Map<string, Set<string>>();
  async incr(key: string) {
    const v = (this.n.get(key) ?? 0) + 1;
    this.n.set(key, v);
    return v;
  }
  async decr(key: string) {
    const v = Math.max(0, (this.n.get(key) ?? 0) - 1);
    this.n.set(key, v);
    return v;
  }
  async get(key: string) {
    return this.n.get(key) ?? 0;
  }
  async sadd(key: string, member: string) {
    const s = this.sets.get(key) ?? new Set<string>();
    const fresh = !s.has(member);
    s.add(member);
    this.sets.set(key, s);
    return fresh;
  }
}

class RedisStore implements CounterStore {
  constructor(private r: Redis) {}
  async incr(key: string, ttlSeconds: number) {
    const v = await this.r.incr(key);
    if (v === 1) await this.r.expire(key, ttlSeconds);
    return v;
  }
  async decr(key: string) {
    return this.r.decr(key);
  }
  async get(key: string) {
    const v = await this.r.get<number>(key);
    return typeof v === 'number' ? v : Number(v ?? 0);
  }
  async sadd(key: string, member: string) {
    return (await this.r.sadd(key, member)) === 1;
  }
}

let singleton: CounterStore | null = null;

export function getStore(): CounterStore {
  if (singleton) return singleton;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  singleton = url && token ? new RedisStore(new Redis({ url, token })) : new MemoryStore();
  return singleton;
}

/** True when a real store is attached. The chat refuses to run without one in production. */
export function storeIsDurable(): boolean {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL) &&
      (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN),
  );
}

/** Test seam. */
export function __setStore(s: CounterStore | null) {
  singleton = s;
}
