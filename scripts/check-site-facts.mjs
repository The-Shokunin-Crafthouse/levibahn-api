// Safety checks for the nightly refresh of lib/site.generated.ts.
// Run after `npm run build:site-facts`, before anything is committed.
// Compares the new file with the committed one (git HEAD). Any failure exits 1,
// so the nightly workflow stops and nothing goes live.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const FILE = 'lib/site.generated.ts';

// Names that must never reach the prompt. Add a name here to block it.
const BLOCKLIST = ['Ethel'];
const ALLOWED_EMAILS = ['levi@levibahn.com'];
const MIN_PAGES = 15;
const MAX_SHRINK = 0.25;
const MAX_GROWTH = 0.3;

const next = readFileSync(FILE, 'utf8');
let prev = '';
try {
  prev = execSync(`git show HEAD:${FILE}`, { encoding: 'utf8', maxBuffer: 50_000_000 });
} catch {
  /* first run: no committed copy to compare */
}

const problems = [];

const pages = (next.match(/PAGE https:\/\/levibahn\.com\//g) ?? []).length;
if (pages < MIN_PAGES) problems.push(`only ${pages} pages crawled (floor is ${MIN_PAGES}); the site may be down`);

for (const word of BLOCKLIST) {
  if (next.toLowerCase().includes(word.toLowerCase())) problems.push(`blocked name found: ${word}`);
}

if (/(?<!\d)(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?!\d)/.test(next)) problems.push('a phone number appears in the text');

const emails = new Set(next.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []);
for (const e of emails) if (!ALLOWED_EMAILS.includes(e.toLowerCase())) problems.push(`unexpected email address: ${e}`);

if (prev) {
  const change = (next.length - prev.length) / prev.length;
  if (change < -MAX_SHRINK) problems.push(`text shrank ${(change * 100).toFixed(0)}% (limit ${MAX_SHRINK * 100}%)`);
  if (change > MAX_GROWTH) problems.push(`text grew ${(change * 100).toFixed(0)}% (limit ${MAX_GROWTH * 100}%)`);
}

if (problems.length) {
  console.error('Site facts check FAILED:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log(`Site facts check passed: ${pages} pages, ${next.length} chars.`);
