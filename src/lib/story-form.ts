import type { HowIKnow } from "@/lib/domain";

export type StoryStep =
  "1" | "1-owner-exists" | "2" | "2-adjust" | "2-review" | "3" | "done" | "checking" | "rejected";

export const STORY_STEPS: Record<StoryStep, string> = {
  "1": "Your story",
  "1-owner-exists": "Your story, owner already here",
  "2": "Photo",
  "2-adjust": "Adjust the plate area",
  "2-review": "Review your photo",
  "3": "Review and submit",
  done: "Story submitted",
  checking: "Being checked",
  rejected: "Couldn't add this story",
};

export const MEANING_MAX = 80;
export const MORE_MAX = 500;

export const MEANING_START = "They might be ";
const meaningPrefix = /^they might be(?:\s|$)/i;

/** Keep the contributor's wording, adding speculative framing only when absent. */
export function frameMeaning(value: string): string {
  const trimmed = value.trim();
  return meaningPrefix.test(trimmed) ? trimmed : `${MEANING_START}${trimmed}`;
}

export function canContinueMeaning(value: string): boolean {
  const framed = frameMeaning(value);
  const interpretation = framed.replace(meaningPrefix, "").trim();
  return interpretation.length >= 3 && framed.length <= MEANING_MAX;
}

/** Shared story-submit notices, so the live flow and its previews cannot drift. */
export const STORY_SUBMIT_ERROR_HEADING = "Hmm... something went wrong.";
export const STORY_SUBMIT_ERROR_MESSAGE =
  "We couldn't submit your story right now. Your words are still here. Please try again.";
export const STORY_RATE_LIMIT_HEADING = "Let's pause a moment.";

export const HOW_OPTIONS: { value: HowIKnow; label: string; image: string }[] = [
  { value: "owner", label: "It's my plate", image: "/brand/how-i-know-owner-v1.webp" },
  {
    value: "knows_owner",
    label: "I know the owner",
    image: "/brand/how-i-know-knows-owner-v1.webp",
  },
  {
    value: "secondhand",
    label: "I asked the driver",
    image: "/brand/how-i-know-asked-driver-v1.webp",
  },
  { value: "guess", label: "My best guess", image: "/brand/how-i-know-guess-v1.webp" },
];

