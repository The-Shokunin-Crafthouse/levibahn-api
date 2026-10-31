import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OFF_TOPIC, REFUSAL_LINE, RefusalGate, visibleAnswer } from '../lib/refusal.js';

test('the canned line is the exact string the client matches (Levi, 2026-10-31)', () => {
  assert.equal(OFF_TOPIC, 'OFF_TOPIC');
  assert.equal(REFUSAL_LINE, "Smartypants only knows about Levi's design expertise. Have something on topic to ask?");
});

test('the sentinel, split across deltas, becomes the canned line and closes the gate', () => {
  const g = new RefusalGate();
  assert.equal(g.push('OFF'), '');
  assert.equal(g.closed, false);
  assert.equal(g.push('_TOP'), '');
  assert.equal(g.push('IC'), REFUSAL_LINE);
  assert.equal(g.closed, true);
  assert.equal(g.push(' anything after'), '');
  assert.equal(g.end(), '');
});

test('leading whitespace and trailing punctuation still match', () => {
  const g = new RefusalGate();
  assert.equal(g.push('\n OFF_TOPIC.'), REFUSAL_LINE);
});

test('a real answer passes through untouched once it leaves the sentinel', () => {
  const g = new RefusalGate();
  assert.equal(g.push('O'), '');
  assert.equal(g.push('n his first day, Levi'), 'On his first day, Levi');
  assert.equal(g.push(' led.'), ' led.');
  assert.equal(g.end(), '');
});

test('an answer that is only a sentinel prefix is flushed at the end', () => {
  const g = new RefusalGate();
  assert.equal(g.push('OFF'), '');
  assert.equal(g.end(), 'OFF');
});

test('the sentinel mid-answer is not a refusal', () => {
  assert.equal(visibleAnswer('Levi says OFF_TOPIC is a word.'), 'Levi says OFF_TOPIC is a word.');
  assert.equal(visibleAnswer('OFF_TOPIC'), REFUSAL_LINE);
});
