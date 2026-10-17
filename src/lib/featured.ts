import type { FeaturedPlate, PlateRecord, PlateStatus } from "./mock-data";
import { plateStatus, publishedStories } from "./mock-data";
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

export function previewFeatured(plate: PlateRecord): FeaturedDisplay {
  return {
    slug: plate.slug,
    jurisdiction: plate.jurisdiction,
    text: plate.text,
    day: plate.plateOfTheDay ?? "",
    count: publishedStories(plate).length,
    atPick: plate.featuredStoryCount ?? 0,
    status: plateStatus(plate),
  };
}

export function featuredDisplay(plate: FeaturedPlate | FeaturedDisplay): FeaturedDisplay {
  return "day" in plate ? plate : previewFeatured(plate);
}

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