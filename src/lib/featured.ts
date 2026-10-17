import type { PlateStatus } from "./domain";
import { storyCount } from "./story-count";
import { track } from "./analytics";

export type FeaturedDisplay = {
  slug: string;
  jurisdiction: string;
  text: string;
  day: string;
  count: number;
  atPick: number;
  status: PlateStatus;
};

export function featuredProgress(atPick: number, now: number): string {
  if (now === 0) return "Still a mystery";
  if (atPick === 0) return `Was a mystery, now ${storyCount(now)}`;
  return `Had ${storyCount(atPick)} when featured, now ${now}`;
}

export function daysAgo(day: string, today: string): number {
  return Math.floor((Date.parse(today) - Date.parse(day)) / 86_400_000);
}

export function openFeatured(plate: FeaturedDisplay, today: string): void {
  void track("featured_subject_opened", {
    is_mystery: plate.count === 0,
    days_ago: daysAgo(plate.day, today),
  });
}
