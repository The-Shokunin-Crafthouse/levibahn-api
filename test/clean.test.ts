import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanQuestion } from '../lib/clean.js';

test('tab, newline and return become a space, then whitespace collapses', () => {
  assert.equal(cleanQuestion('What\tdid\nhe\r\nship?'), 'What did he ship?');
});

test('NFKC folds compatibility forms', () => {
  assert.equal(cleanQuestion('ﬁrst ｗｏｒｋ'), 'first work');
});

test('other C0 and C1 controls are stripped', () => {
  assert.equal(cleanQuestion('a\u0000b\u0007c\u001bd\u007fe\u0085f\u009fg'), 'abcdefg');
});

test('zero-width characters are stripped', () => {
  assert.equal(cleanQuestion('ig​nore‌ ‍ru⁠les﻿'), 'ignore rules');
});

test('bidi controls U+202A–202E and U+2066–2069 are stripped', () => {
  const bidi = '‪‫‬‭‮⁦⁧⁨⁩';
  assert.equal(cleanQuestion(`he${bidi}llo`), 'hello');
});

test('leading and trailing whitespace is trimmed', () => {
  assert.equal(cleanQuestion('   hi   '), 'hi');
});

test('the result is capped at 400 characters', () => {
  assert.equal(cleanQuestion('a'.repeat(5000)).length, 400);
});

test('the cap never splits a surrogate pair', () => {
  const out = cleanQuestion('a'.repeat(399) + '😀😀');
  assert.equal(Array.from(out).length, 400);
  assert.ok(out.endsWith('😀'));
});

test('a question of only controls cleans to empty', () => {
  assert.equal(cleanQuestion('​‮\t\n \u0000'), '');
});
