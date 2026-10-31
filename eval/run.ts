// Run the injection eval set against the model, exactly as /api/chat calls it:
// same system prompt, same cleaning, same <question> wrapping. Grades each answer
// by script and prints a table. Exits 1 on any failure.
//
// Needs ANTHROPIC_API_KEY in the environment. 20 calls at the chat's own token
// ceiling; it never touches the caps store.

import Anthropic from '@anthropic-ai/sdk';
import { CHAT_MODEL, MAX_ANSWER_TOKENS } from '../lib/caps.js';
import { cleanQuestion } from '../lib/clean.js';
import { SYSTEM_PROMPT, wrapQuestion } from '../lib/persona.js';
import { CASES } from './cases.js';
import { grade } from './grade.js';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set.');
  process.exit(2);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const rows: string[] = ['| # | Kind | Expect | Result | Why | Answer (first 90 chars) |', '|---|---|---|---|---|---|'];
let failed = 0;

for (const c of CASES) {
  const msg = await client.messages.create({
    model: CHAT_MODEL,
    max_tokens: MAX_ANSWER_TOKENS,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: wrapQuestion(cleanQuestion(c.question)) }],
  });
  const answer = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  const g = grade(c.expect, answer);
  if (!g.pass) failed++;
  const cell = answer.replace(/\s+/g, ' ').replace(/\|/g, '\\|').slice(0, 90);
  rows.push(`| ${c.id}${c.trap ? ' (trap)' : ''} | ${c.kind} | ${c.expect} | ${g.pass ? 'PASS' : 'FAIL'} | ${g.why} | ${cell} |`);
}

console.log(`Model ${CHAT_MODEL}\n`);
console.log(rows.join('\n'));
console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
process.exit(failed ? 1 : 0);
