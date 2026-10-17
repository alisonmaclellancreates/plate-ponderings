import type { Consensus } from "./domain";

/** Brief score table: 0–33 Largely agree, 34–66 Mixed views, 67–100 Opinions differ. */
export function consensusFor(score: number): Consensus {
  if (score <= 33) return "agree";
  if (score <= 66) return "mixed";
  return "differ";
}

/** The model is told not to use em dashes; any that slip through are replaced before saving. */
export function replaceEmDashes(text: string): string {
  return text.replace(/\s*\u2014\s*/g, ", ");
}

export type VisibleVersionStamp = { startedAt: string; storyCount: number };

/**
 * Catching up when published stories exist but no visible version does, when
 * the newest published story arrived after the newest visible version began,
 * or when the published count differs from that version's stored count.
 */
export function isCatchingUp(input: {
  publishedCount: number;
  newestPublishedAt: string | null;
  newestVisible: VisibleVersionStamp | null;
}): boolean {
  const { publishedCount, newestPublishedAt, newestVisible } = input;
  if (publishedCount === 0) return false;
  if (!newestVisible) return true;
  if (publishedCount !== newestVisible.storyCount) return true;
  if (newestPublishedAt && Date.parse(newestPublishedAt) > Date.parse(newestVisible.startedAt)) {
    return true;
  }
  return false;
}

export const HISTORY_PAGE_SIZE = 3;

export const CATCHING_UP_MESSAGE = "New stories have arrived. The Story So Far is catching up.";
