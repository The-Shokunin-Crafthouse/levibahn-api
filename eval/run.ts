// Run the injection eval set against the model, exactly as /api/chat calls it:
// same system prompt, same cleaning, same <question> wrapping. Grades each answer
// by script and prints a table. Exits 1 on any failure.
//
// Flags: --only 17,20 runs those cases; --repeat 5 runs each case that many times.
// An empty answer prints its stop reason and content block types, so it can be told
// apart from a refusal.
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

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const only = flag('--only')?.split(',').map(Number);
const repeat = Math.max(1, Number(flag('--repeat') ?? 1));
const cases = CASES.filter((c) => !only || only.includes(c.id)).flatMap((c) => Array.from({ length: repeat }, () => c));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const rows: string[] = ['| # | Kind | Expect | Result | Why | Answer (first 90 chars) |', '|---|---|---|---|---|---|'];
let failed = 0;

for (const c of cases) {
  const msg = await client.messages.create({
    model: CHAT_MODEL,
    max_tokens: MAX_ANSWER_TOKENS,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: wrapQuestion(cleanQuestion(c.question)) }],
  });
  const answer = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  const g = grade(c.expect, answer);
  if (!g.pass) failed++;
  const diag = answer.trim()
    ? ''
    : ` [stop_reason=${msg.stop_reason}; blocks=${msg.content.map((b) => b.type).join(',') || 'none'}; out_tokens=${msg.usage.output_tokens}]`;
  const cell = answer.replace(/\s+/g, ' ').replace(/\|/g, '\\|').slice(0, 90);
  rows.push(`| ${c.id}${c.trap ? ' (trap)' : ''} | ${c.kind} | ${c.expect} | ${g.pass ? 'PASS' : 'FAIL'} | ${g.why}${diag} | ${cell} |`);
}

console.log(`Model ${CHAT_MODEL}\n`);
console.log(rows.join('\n'));
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
