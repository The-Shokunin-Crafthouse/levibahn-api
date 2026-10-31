// The one request /api/chat sends to the model. The eval builds its calls from
// this too, so what is graded is what ships.

import type Anthropic from '@anthropic-ai/sdk';
import { CHAT_MODEL, MAX_ANSWER_TOKENS } from './caps.js';
import { cleanQuestion } from './clean.js';
import { SYSTEM_PROMPT, wrapQuestion } from './persona.js';

export function chatParams(question: string): Anthropic.MessageStreamParams {
  return {
    model: CHAT_MODEL,
    max_tokens: MAX_ANSWER_TOKENS,
    // Off, so the whole ceiling goes to the answer. With thinking on, the trap
    // case spent all 450 tokens thinking and returned no text (eval, 2026-10-31).
    thinking: { type: 'disabled' },
    // System prompt first and unchanged per call, so the prompt cache hits (ADR-122, #187, #310).
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    // Cleaning is idempotent, so a question the handler already cleaned is unchanged.
    messages: [{ role: 'user', content: wrapQuestion(cleanQuestion(question)) }],
  };
}
