import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handler, POLL_SEED } from '../api/poll.js';
import { __setStore } from '../lib/store.js';

type Body = { total: number; options: { value: number; count: number; percent: number }[]; voted: number | null };

function fresh() {
  __setStore(null);
}

async function call(method: 'GET' | 'POST', vid?: string, value?: number): Promise<Body> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (vid) headers['x-visitor-id'] = vid;
  const res = await handler(
    new Request('https://api.test/api/poll', {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify({ value }) : undefined,
    }),
  );
  assert.equal(res.status, 200);
  return (await res.json()) as Body;
}

const pct = (b: Body) => b.options.map((o) => o.percent);

test('a first visitor sees the seed: 31 · 57 · 12', async () => {
  fresh();
  const b = await call('GET');
  assert.deepEqual(pct(b), [31, 57, 12]);
  assert.equal(b.total, 100);
  assert.equal(b.voted, null);
});

test('the seed is the only source of the starting numbers', () => {
  assert.deepEqual(POLL_SEED, { 6: 31, 13: 57, 21: 12 });
});

test('a real vote adds on top of the seed', async () => {
  fresh();
  const b = await call('POST', 'visitor-aaaaaaaa', 21);
  assert.equal(b.total, 101);
  assert.equal(b.options.find((o) => o.value === 21)?.count, 13);
  assert.equal(b.voted, 21);
});

test('GET returns a returning visitor their stored vote', async () => {
  fresh();
  await call('POST', 'visitor-bbbbbbbb', 13);
  const b = await call('GET', 'visitor-bbbbbbbb');
  assert.equal(b.voted, 13);
  const other = await call('GET', 'visitor-cccccccc');
  assert.equal(other.voted, null);
});

test('a repeat POST returns the stored vote and counts nothing', async () => {
  fresh();
  await call('POST', 'visitor-dddddddd', 6);
  const again = await call('POST', 'visitor-dddddddd', 21);
  assert.equal(again.voted, 6);
  assert.equal(again.total, 101);
  assert.equal(again.options.find((o) => o.value === 21)?.count, 12);
});
