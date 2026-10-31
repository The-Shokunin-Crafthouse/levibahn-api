// Input cleaning for the question, in the order spec 60 §10 fixes. The server is
// the authority; the client runs the same steps only to save a wasted request.

import { CAPS } from './caps.js';

// Tab, newline, return.
const LINE_BREAKS = /[\t\n\r]/g;
// The other C0 controls, DEL, and the C1 controls.
const CONTROLS = /[\u0000-\u001f\u007f-\u009f]/g;
// Zero-width characters, and the bidi controls (embeddings and overrides, isolates).
const INVISIBLE = /[\u200b-\u200d\u2060\ufeff\u202a-\u202e\u2066-\u2069]/g;

export function cleanQuestion(raw: string): string {
  const s = raw
    .replace(LINE_BREAKS, ' ')
    .normalize('NFKC')
    .replace(CONTROLS, '')
    .replace(INVISIBLE, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Cap by code point so a pasted emoji is never split into a lone surrogate.
  return Array.from(s).slice(0, CAPS.maxQuestionChars).join('').trim();
}
