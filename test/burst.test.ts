import { test } from 'node:test';
import assert from 'node:assert/strict';
import { burst, BURST_PER_IP_PER_MINUTE } from '../lib/limits.js';
import { __setStore, getStore } from '../lib/store.js';

function fresh() {
  __setStore(null);
  return getStore();
}

test('the burst limit is 3 per IP per minute', () => {
  assert.equal(BURST_PER_IP_PER_MINUTE, 3);
});

test('a fourth request in one minute from one IP is refused', async () => {
  const store = fresh();
  const now = new Date('2026-10-30T12:00:05Z');
  for (let i = 0; i < 3; i++) assert.equal(await burst(store, '5.5.5.5', now), true);
  assert.equal(await burst(store, '5.5.5.5', now), false);
});

test('another IP is not affected', async () => {
  const store = fresh();
  const now = new Date('2026-10-30T12:00:05Z');
  for (let i = 0; i < 4; i++) await burst(store, '6.6.6.6', now);
  assert.equal(await burst(store, '7.7.7.7', now), true);
});

test('the next minute opens again', async () => {
  const store = fresh();
  for (let i = 0; i < 4; i++) await burst(store, '8.8.8.8', new Date('2026-10-30T12:00:59Z'));
  assert.equal(await burst(store, '8.8.8.8', new Date('2026-10-30T12:01:00Z')), true);
});
