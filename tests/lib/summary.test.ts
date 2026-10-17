import { describe, expect, it } from "vitest";
import { consensusFor, isCatchingUp, replaceEmDashes, HISTORY_PAGE_SIZE } from "@/lib/summary";

describe("consensusFor", () => {
  it("follows the brief's score table at every boundary", () => {
    expect(consensusFor(0)).toBe("agree");
    expect(consensusFor(33)).toBe("agree");
    expect(consensusFor(34)).toBe("mixed");
    expect(consensusFor(66)).toBe("mixed");
    expect(consensusFor(67)).toBe("differ");
    expect(consensusFor(100)).toBe("differ");
  });
});

describe("replaceEmDashes", () => {
  it("replaces every em dash and its spacing", () => {
    expect(replaceEmDashes("One view \u2014 another\u2014third")).toBe(
      "One view, another, third",
    );
    expect(replaceEmDashes("No dashes here - just a hyphen.")).toBe(
      "No dashes here - just a hyphen.",
    );
  });
});

describe("isCatchingUp", () => {
  const v = { startedAt: "2026-10-10T00:00:00Z", storyCount: 2 };
  it("is false with no published stories, even with no version", () => {
    expect(isCatchingUp({ publishedCount: 0, newestPublishedAt: null, newestVisible: null })).toBe(
      false,
    );
  });
  it("is true when published stories exist but no visible version does", () => {
    expect(
      isCatchingUp({
        publishedCount: 1,
        newestPublishedAt: "2026-10-01T00:00:00Z",
        newestVisible: null,
      }),
    ).toBe(true);
  });
  it("is true when the published count differs from the stored count", () => {
    expect(
      isCatchingUp({
        publishedCount: 3,
        newestPublishedAt: "2026-10-01T00:00:00Z",
        newestVisible: v,
      }),
    ).toBe(true);
  });
  it("is true when the newest published story is newer than the newest visible version", () => {
    expect(
      isCatchingUp({
        publishedCount: 2,
        newestPublishedAt: "2026-10-11T00:00:00Z",
        newestVisible: v,
      }),
    ).toBe(true);
  });
  it("is false when the newest visible version covers every published story", () => {
    expect(
      isCatchingUp({
        publishedCount: 2,
        newestPublishedAt: "2026-10-09T00:00:00Z",
        newestVisible: v,
      }),
    ).toBe(false);
    expect(isCatchingUp({ publishedCount: 2, newestPublishedAt: null, newestVisible: v })).toBe(
      false,
    );
  });
  it("shows history three at a time", () => {
    expect(HISTORY_PAGE_SIZE).toBe(3);
  });
});
