import { describe, expect, it } from "vitest";
import { CATCHING_UP_STORY, CURRENT_USER, PLATES } from "@/lib/mock-data";
import { samplePlate, sampleStories, sampleSummary, toPlateStory } from "@/lib/preview-samples";

describe("preview samples", () => {
  it("finds sample plates and refuses unknown ones", () => {
    expect(samplePlate("ca-teatime").text).toBe("TEATIME");
    expect(() => samplePlate("nope")).toThrow("Unknown sample plate: nope");
  });

  it("maps a sample story to the plate page's story shape", () => {
    const own = toPlateStory({
      id: "x",
      handle: CURRENT_USER.handle,
      date: "2026-10-01",
      meaning: "M",
      howIKnow: "guess",
      hearts: 2,
    });
    expect(own).toMatchObject({ isOwn: true, body: null, photo: null, photoBox: null });
    expect(own.publishedAt).toBe("2026-10-01T12:00:00Z");
    const photo = samplePlate("bc-lv2code").stories.find((s) => s.photo);
    expect(toPlateStory(photo!)).toMatchObject({ isOwn: false, photo: photo!.photo });
  });

  it("counts only published stories, newest first, and names the owner", () => {
    const owner = sampleStories(samplePlate("ca-teatime"));
    expect(owner.hasOwnerStory).toBe(true);
    expect(owner.ownerHandle).toBe("teadragon");
    const none = sampleStories(samplePlate("nm-chile"));
    expect(none).toMatchObject({
      storyCount: 0,
      total: 0,
      hasOwnerStory: false,
      ownerHandle: null,
    });
  });

  it("adds extra and pending stories without changing the shared record", () => {
    const before = samplePlate("bc-lv2code").stories.length;
    const result = sampleStories(samplePlate("bc-lv2code"), {
      extra: [CATCHING_UP_STORY],
      pending: [CATCHING_UP_STORY],
    });
    expect(result.stories[0]?.id).toBe(CATCHING_UP_STORY.id);
    expect(result.storyCount).toBe(before + 1);
    expect(result.pending).toHaveLength(1);
    expect(PLATES.find((p) => p.slug === "bc-lv2code")?.stories).toHaveLength(before);
  });

  it("splits summaries into the current version and earlier ones", () => {
    const summaries = samplePlate("bc-lv2code").summaries;
    const result = sampleSummary(summaries, true);
    expect(result.current?.version).toBe(summaries.length);
    expect(result.earlier).toHaveLength(summaries.length - 1);
    expect(result.catchingUp).toBe(true);
    expect(sampleSummary([])).toEqual({ current: null, earlier: [], catchingUp: false });
  });
});
