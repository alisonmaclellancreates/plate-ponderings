import { expect, it, vi } from "vitest";
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
import { track } from "@/lib/analytics";
import {
  daysAgo,
  featuredDisplay,
  featuredProgress,
  openFeatured,
  previewFeatured,
} from "@/lib/featured";
import { PLATES } from "@/../tests/fixtures/plates";

it.each([
  [5, 0, "Still a mystery"],
  [0, 1, "Was a mystery, now 1 story"],
  [0, 4, "Was a mystery, now 4 stories"],
  [1, 2, "Had 1 story when featured, now 2"],
  [3, 1, "Had 3 stories when featured, now 1"],
] as const)("formats %i at pick and %i now", (atPick, now, expected) => {
  expect(featuredProgress(atPick, now)).toBe(expected);
});
it("adapts previews without inventing human stories and preserves live records", () => {
  for (const p of PLATES) expect(previewFeatured(p).slug).toBe(p.slug);
  const p = PLATES[0];
  if (!p) throw new Error("Missing preview");
  const dated = { ...p, plateOfTheDay: "2026-10-16" };
  const display = featuredDisplay(dated);
  expect(display.day).toBe("2026-10-16");
  expect(featuredDisplay(display)).toBe(display);
});
it("records only mystery status and UTC days elapsed", () => {
  expect(daysAgo("2026-10-16", "2026-10-17")).toBe(1);
  const p = {
    slug: "private-id",
    jurisdiction: "Washington",
    text: "PRIVATE",
    day: "2026-10-17",
    atPick: 0,
    count: 0,
    status: "mystery" as const,
  };
  openFeatured(p, "2026-10-17");
  expect(track).toHaveBeenLastCalledWith("featured_subject_opened", {
    is_mystery: true,
    days_ago: 0,
  });
  openFeatured({ ...p, count: 2, day: "2026-10-15" }, "2026-10-17");
  expect(track).toHaveBeenLastCalledWith("featured_subject_opened", {
    is_mystery: false,
    days_ago: 2,
  });
});
