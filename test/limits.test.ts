import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAPS } from '../lib/caps.js';
import { reserve, refund, keys } from '../lib/limits.js';
import { __setStore, getStore } from '../lib/store.js';

function fresh() {
  __setStore(null);
  return getStore();
}

test('a visitor gets exactly perVisitorPerDay questions, then a visitor refusal', async () => {
  const store = fresh();
  for (let i = 1; i <= CAPS.perVisitorPerDay; i++) {
    const v = await reserve(store, 'visitor-aaaaaaaa', '1.1.1.1');
    assert.equal(v.ok, true, `question ${i} should be allowed`);
    if (v.ok) assert.equal(v.remainingForVisitor, CAPS.perVisitorPerDay - i);
  }
  const over = await reserve(store, 'visitor-aaaaaaaa', '1.1.1.1');
  assert.deepEqual(over, { ok: false, reason: 'visitor', remainingForVisitor: 0 });
});

test('a refused request does not consume site budget', async () => {
  const store = fresh();
  for (let i = 0; i < CAPS.perVisitorPerDay; i++) await reserve(store, 'visitor-bbbbbbbb', '2.2.2.2');
  const before = await store.get(keys('x', 'y').site);
  await reserve(store, 'visitor-bbbbbbbb', '2.2.2.2');
  const after = await store.get(keys('x', 'y').site);
  assert.equal(after, before);
});

test('the IP cap catches a visitor who clears storage', async () => {
  const store = fresh();
  let allowed = 0;
  for (let i = 0; i < CAPS.perIpPerDay + 3; i++) {
    const v = await reserve(store, `visitor-${String(i).padStart(8, '0')}`, '3.3.3.3');
    if (v.ok) allowed++;
    else assert.equal(v.reason, 'ip');
  }
  assert.equal(allowed, CAPS.perIpPerDay);
});

test('the site cap stops everyone', async () => {
  const store = fresh();
  let allowed = 0;
  let lastReason = '';
  for (let i = 0; i < CAPS.sitePerDay + 2; i++) {
    const v = await reserve(store, `visitor-${String(i).padStart(8, '0')}`, `10.0.${Math.floor(i / 10)}.${i % 10}`);
    if (v.ok) allowed++;
    else lastReason = v.reason;
  }
  assert.equal(allowed, CAPS.sitePerDay);
  assert.equal(lastReason, 'site');
});

test('refund gives the question back', async () => {
  const store = fresh();
  await reserve(store, 'visitor-cccccccc', '4.4.4.4');
  await refund(store, 'visitor-cccccccc', '4.4.4.4');
  assert.equal(await store.get(keys('visitor-cccccccc', '4.4.4.4').visitor), 0);
});

test('counters are keyed by UTC day', () => {
  const a = keys('v', 'ip', '2026-10-22');
  const b = keys('v', 'ip', '2026-10-23');
  assert.notEqual(a.visitor, b.visitor);
});
