import { describe, expect, it } from "vitest";
import { PLATES, plateStatus, STORY_PHOTO_PLACEHOLDER } from "@/lib/mock-data";
import { plateFontSize, plateTone } from "@/lib/jurisdictions";

const find = (text: string) => {
  const plate = PLATES.find((p) => p.text === text);
  if (!plate) throw new Error(text);
  return plate;
};

describe("mock data", () => {
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
