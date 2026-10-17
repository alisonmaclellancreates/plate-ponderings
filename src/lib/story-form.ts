import type { HowIKnow } from "@/lib/mock-data";

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

export const HOW_OPTIONS: { value: HowIKnow; label: string; image: string }[] = [
  { value: "owner", label: "It's my plate", image: "/brand/how-i-know-owner-v1.webp" },
  { value: "knows_owner", label: "I know the owner", image: "/brand/how-i-know-knows-owner-v1.webp" },
  { value: "secondhand", label: "I asked the driver", image: "/brand/how-i-know-asked-driver-v1.webp" },
  { value: "guess", label: "My best guess", image: "/brand/how-i-know-guess-v1.webp" },
];

/** Sample answers shown on review and on the rejected step; preview only. */
export const SAMPLE_STORY = {
  how: "owner" as HowIKnow,
  meaning: "Pacific Northwest love.",
  more: "I grew up near Portland and wanted a plate that says where my heart is.",
};
