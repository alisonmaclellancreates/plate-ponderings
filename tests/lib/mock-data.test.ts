import { describe, expect, it } from "vitest";
import {
  PLATES,
  plateStatus,
  STORY_PHOTO_PLACEHOLDER,
  featuredPlates,
  featuredProgress,
  publishedStories,
} from "@/../tests/fixtures/plates";
import { plateFontSize, plateTone } from "@/lib/jurisdictions";

const find = (text: string) => {
  const plate = PLATES.find((p) => p.text === text);
  if (!plate) throw new Error(text);
  return plate;
};

describe("mock data", () => {
  it.each([
    [0, 0, "Still a mystery"],
    [2, 0, "Still a mystery"],
    [0, 1, "Was a mystery, now 1 story"],
    [0, 3, "Was a mystery, now 3 stories"],
    [2, 5, "Had 2 stories when featured, now 5"],
    [2, 1, "Had 2 stories when featured, now 1"],
    [1, 3, "Had 1 story when featured, now 3"],
  ] as const)("formats progress from %i to %i", (then, now, text) => {
    expect(featuredProgress(then, now)).toBe(text);
  });

  it("has 14 featured records newest first with all progress cases", () => {
    const featured = featuredPlates();
    expect(featured).toHaveLength(14);
    expect(featured[0]?.slug).toBe("ut-canyons");
    expect(featured.map((p) => p.plateOfTheDay)).toEqual(
      featured
        .map((p) => p.plateOfTheDay)
        .sort()
        .reverse(),
    );
    const progress = featured.map((p) =>
      featuredProgress(p.featuredStoryCount ?? 0, publishedStories(p).length),
    );
    expect(progress).toContain("Still a mystery");
    expect(progress).toContain("Was a mystery, now 1 story");
    expect(progress).toContain("Was a mystery, now 2 stories");
    expect(progress).toContain("Had 3 stories when featured, now 5");
    expect(publishedStories(find("CHILE"))).toHaveLength(0);
    expect(plateStatus(find("CHILE"))).toBe("mystery");
    expect(publishedStories(find("PRAIRIE"))).toHaveLength(1);
  });
  it("matches the brief", () => {
    expect(find("B7K2L9").stories).toHaveLength(0);
    expect(find("LV2CODE").stories).toHaveLength(5);
    expect(find("LV2CODE").summaries).toHaveLength(4);
    expect(find("TEATIME").stories).toHaveLength(6);
    expect(find("CANYONS").plateOfTheDay).toBeTruthy();
    expect(find("PNW LV").stories.length).toBeGreaterThan(0);
  });

  it("derives status", () => {
    expect(plateStatus(find("B7K2L9"))).toBe("mystery");
    expect(plateStatus(find("LV2CODE"))).toBe("interpreted");
    expect(plateStatus(find("TEATIME"))).toBe("owner");
  });

  it("keeps LV2CODE history counts consistent with published story dates", () => {
    const plate = find("LV2CODE");
    for (const summary of plate.summaries) {
      expect(plate.stories.filter((story) => story.date <= summary.date)).toHaveLength(
        summary.storyCount,
      );
    }
    expect(plate.stories).toHaveLength(5);
    expect(plate.stories.some((story) => story.date === "2026-10-14")).toBe(false);
    expect(STORY_PHOTO_PLACEHOLDER).toBe("/mock/story-photo-placeholder.jpg");
  });
});

describe("jurisdictions", () => {
  it("looks up tones case-insensitively with fallback", () => {
    expect(plateTone(" british columbia ")).toBe("bc");
    expect(plateTone("Nova Scotia")).toBe("fallback");
  });

  it("caps short text and shrinks long text", () => {
    expect(plateFontSize("")).toBe("22.00cqw");
    expect(parseFloat(plateFontSize("ILUV2CODE"))).toBeLessThan(14);
  });
});
