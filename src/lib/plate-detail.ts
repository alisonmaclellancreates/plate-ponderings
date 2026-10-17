import type { Story } from "@/lib/mock-data";

export type PlateDetailState =
  | "mystery"
  | "interpreted"
  | "owner"
  | "interpreted-history"
  | "pending-story"
  | "catching-up"
  | "pnw-lv";

export const PLATE_DETAIL_STATES: Record<PlateDetailState, { slug: string; label: string }> = {
  mystery: { slug: "wa-b7k2l9", label: "Mystery plate" },
  interpreted: { slug: "bc-lv2code", label: "Interpreted plate" },
  owner: { slug: "ca-teatime", label: "Owner claim" },
  "interpreted-history": { slug: "bc-lv2code", label: "Earlier summaries open" },
  "pending-story": { slug: "bc-lv2code", label: "Your story is pending" },
  "catching-up": { slug: "bc-lv2code", label: "Summary catching up" },
  "pnw-lv": { slug: "or-pnwlv", label: "Oregon PNW LV" },
};

export const PAGE_SIZE = 5;

/** Owner story first, then everything else oldest first. Never sorted by hearts. */
export function orderStories(stories: Story[]): Story[] {
  const owner = stories.filter((s) => s.howIKnow === "owner");
  const rest = stories
    .filter((s) => s.howIKnow !== "owner")
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return [...owner, ...rest];
}
