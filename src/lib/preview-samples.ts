/**
 * Adapters from the sample records in mock-data.ts to the shapes live screens take.
 * Each sample is composed fresh; shared records are never mutated.
 */
import type { Story, Summary, PlateRecord } from "@/lib/domain";
import type { PlateStoriesResult, PlateStory } from "@/lib/stories.functions";
import type { PlateSummaryResult } from "@/lib/summaries.functions";
import { CURRENT_USER, PLATES, publishedStories } from "@/lib/mock-data";

export function samplePlate(slug: string): PlateRecord {
  const plate = PLATES.find((p) => p.slug === slug);
  if (!plate) throw new Error(`Unknown sample plate: ${slug}`);
  return plate;
}

export function toPlateStory(story: Story): PlateStory {
  return {
    id: story.id,
    meaning: story.meaning,
    source: story.howIKnow,
    body: story.longer ?? null,
    handle: story.handle,
    hearts: story.hearts,
    publishedAt: `${story.date}T12:00:00Z`,
    photo: story.photo ?? null,
    photoBox: story.photoBox ?? null,
    isOwn: story.handle === CURRENT_USER.handle,
    hearted: false,
  };
}

/** The plate page's stories result: published stories newest first, plus your pending ones. */
export function sampleStories(
  plate: PlateRecord,
  { extra = [], pending = [] }: { extra?: Story[]; pending?: Story[] } = {},
): PlateStoriesResult {
  const published = [...publishedStories(plate), ...extra].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const owner = published.find((s) => s.howIKnow === "owner");
  return {
    stories: published.map(toPlateStory),
    total: published.length,
    pending: pending.map(toPlateStory),
    storyCount: published.length,
    ownerHandle: owner?.handle ?? null,
    hasOwnerStory: Boolean(owner),
  };
}

/** The Story So Far result from newest-first sample summaries. */
export function sampleSummary(summaries: Summary[], catchingUp = false): PlateSummaryResult {
  const versions = summaries.map((s, i) => ({
    version: summaries.length - i,
    text: s.text,
    consensus: s.consensus,
    storyCount: s.storyCount,
    generatedAt: `${s.date}T12:00:00Z`,
  }));
  const [current, ...earlier] = versions;
  return { current: current ?? null, earlier, catchingUp };
}
