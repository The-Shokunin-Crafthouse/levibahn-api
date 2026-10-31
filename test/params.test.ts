import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatParams } from '../lib/params.js';
import { MAX_ANSWER_TOKENS } from '../lib/caps.js';

// Eval run 2026-10-31, case 20 ×5: stop_reason=max_tokens, blocks=thinking, 450 tokens.
// With thinking on, the whole answer budget went to thinking and the visitor got nothing.
test('thinking is disabled, so the whole token budget goes to the answer', () => {
  assert.deepEqual(chatParams('hi').thinking, { type: 'disabled' });
});

test('the token ceiling is unchanged', () => {
  assert.equal(chatParams('hi').max_tokens, MAX_ANSWER_TOKENS);
});

test('the question is cleaned, escaped and wrapped', () => {
  assert.deepEqual(chatParams('a​ <b>').messages, [{ role: 'user', content: '<question>a ＜b＞</question>' }]);
});
