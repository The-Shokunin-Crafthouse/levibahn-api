// Spend caps for the Claude Q&A. One file, four numbers. Decided 2026-10-22
// (decisions.md, Gate 1 block, item 9). The Anthropic console carries the hard
// stop ($20/month); these keep ordinary traffic well under it.

export const CAPS = {
  /** Questions one visitor (browser) may ask per UTC day. */
  perVisitorPerDay: 6,
  /** Questions one IP address may ask per UTC day. Catches cleared storage. */
  perIpPerDay: 12,
  /** Questions the whole site may ask per UTC day. */
  sitePerDay: 150,
  /** Longest question accepted, in characters. */
  maxQuestionChars: 400,
} as const;

/** Model is an env override so swapping is a one-line dashboard change. */
export const CHAT_MODEL = process.env.CHAT_MODEL ?? 'claude-haiku-5-5';

/** Max tokens per answer. Copy-surgeon answers are short; this is a ceiling, not a target. */
export const MAX_ANSWER_TOKENS = 450;
