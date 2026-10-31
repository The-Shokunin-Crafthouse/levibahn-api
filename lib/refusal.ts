// The off-topic reply. The model answers an off-topic question with the bare
// sentinel; the server swaps in Levi's line and stops reading the stream, so a
// refusal costs a few output tokens and always reads the same (Levi, 2026-10-31).

/** What the model replies, alone, to an off-topic question. */
export const OFF_TOPIC = 'OFF_TOPIC';

/** What the visitor sees instead. The portfolio-site client matches it exactly. */
export const REFUSAL_LINE = "Smartypants only knows about Levi's design expertise. Have something on topic to ask?";

/**
 * Holds the start of a stream while it could still be the sentinel. Once the
 * text leaves the sentinel, everything passes through untouched. Once it matches,
 * push() returns the canned line once and `closed` tells the caller to stop.
 */
export class RefusalGate {
  private held = '';
  private open = false;
  closed = false;

  push(text: string): string {
    if (this.closed) return '';
    if (this.open) return text;
    this.held += text;
    const lead = this.held.trimStart();
    if (lead.startsWith(OFF_TOPIC)) {
      this.closed = true;
      return REFUSAL_LINE;
    }
    if (OFF_TOPIC.startsWith(lead)) return '';
    this.open = true;
    return this.held;
  }

  /** Whatever is still held when the stream ends. */
  end(): string {
    if (this.closed || this.open) return '';
    return this.held;
  }
}

/** A whole answer as the visitor sees it. */
export function visibleAnswer(raw: string): string {
  const g = new RefusalGate();
  return g.push(raw) + g.end();
}
