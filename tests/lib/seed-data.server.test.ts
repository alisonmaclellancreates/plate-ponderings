import { afterEach, expect, it, vi } from "vitest";
import seedText from "../../docs/seed.md?raw";
import { buildSeed, SEED_HANDLES, SEED_PHOTO_BOXES } from "@/lib/seed-data.server";
const accounts = Object.fromEntries(SEED_HANDLES.map((h) => [h, crypto.randomUUID()]));
const paths = Object.fromEntries(
  Object.keys(SEED_PHOTO_BOXES).map((p) => [
    p,
    `${crypto.randomUUID()}/${crypto.randomUUID()}.jpg`,
  ]),
);
it("builds the literal scenario, histories and Pacific times relative to the demo day", () => {
  const seed = buildSeed("2026-10-17", accounts, paths);
  expect(seed.subjects).toHaveLength(16);
  expect(seed.subjects.filter((p) => p.status === "published")).toHaveLength(15);
  expect(seed.stories.filter((s) => s.status === "published")).toHaveLength(15);
  expect(seed.stories.filter((s) => s.status === "pending")).toHaveLength(1);
  expect(seed.stories.filter((s) => s.status === "rejected")).toHaveLength(1);
  expect(seed.summaries).toHaveLength(9);
  expect(seed.featured_days).toHaveLength(5);
  expect(seed.notifications).toHaveLength(2);
  expect(
    seed.notifications.every((n) => n.read_at === null && n.user_id === accounts["Traveler4821"]),
  ).toBe(true);
  expect(seed.reports).toHaveLength(1);
  const rainy = seed.stories[0];
  expect(rainy?.meaning).toBe("Rainy seven quarts: someone measuring Oregon rain");
  expect(rainy?.created_at).toBe("2026-10-13T16:10:00.000Z");
  for (const story of seed.stories.filter((s) => s.photo_path)) {
    const plate = seed.subjects.find((p) => p.id === story.subject_id);
    expect(story.photo_box).toEqual(SEED_PHOTO_BOXES[plate?.identity_b ?? ""]);
    expect(story.photo_path).toMatch(/^[\da-f-]+\/[\da-f-]+\.jpg$/);
  }
  for (const heart of seed.hearts)
    expect(heart.user_id).not.toBe(seed.stories.find((s) => s.id === heart.story_id)?.author_id);
  const shifted = buildSeed("2026-10-18", accounts, paths);
  expect(shifted.stories[0]?.created_at).toBe("2026-10-14T16:10:00.000Z");
  expect(shifted.featured_days.at(-1)?.day).toBe("2026-10-18");
});
it("refuses missing accounts or photos before constructing incomplete content", () => {
  expect(() => buildSeed("2026-10-17", {}, paths)).toThrow("account mapping");
  expect(() => buildSeed("2026-10-17", accounts, {})).toThrow("photo mapping");
});

afterEach(() => {
  vi.doUnmock("../../docs/seed.md?raw");
  vi.resetModules();
});

it("rejects an unknown source label in the literal seed document", async () => {
  vi.resetModules();
  vi.doMock("../../docs/seed.md?raw", () => ({
    default: seedText.replace("My best guess", "Unknown source"),
  }));
  const { buildSeed: buildModifiedSeed } = await import("@/lib/seed-data.server");
  expect(() => buildModifiedSeed("2026-10-17", accounts, paths)).toThrow("Unknown seed source.");
});

it.each([
  ["sample history", (text: string) => text.replace("**Pending story on RAINY7Q**", "**Removed pending history**"), "Seed sample history missing."],
  ["notification story", (text: string) => text.replace("1. **Traveler4821** · My best guess", "1. **FogLightFan** · My best guess"), "Seed notification story missing."],
  ["report story", (text: string) => text.replace("**ParkingLotOracle**", "**MileMarker88**"), "Seed report story missing."],
  ["story count", (text: string) => text.replace(/1\. \*\*RoadTripRaven\*\*[^\n]+/, "Removed story"), "Approved seed content counts do not match."],
])("rejects malformed seed %s", async (_label, mutate, error) => {
  vi.resetModules();
  vi.doMock("../../docs/seed.md?raw", () => ({ default: mutate(seedText) }));
  const { buildSeed: buildModifiedSeed } = await import("@/lib/seed-data.server");
  expect(() => buildModifiedSeed("2026-10-17", accounts, paths)).toThrow(error);
});

it("uses a null box when a photo's box mapping is absent", () => {
  const box = SEED_PHOTO_BOXES["RAINY7Q"];
  delete SEED_PHOTO_BOXES["RAINY7Q"];
  try {
    const seed = buildSeed("2026-10-17", accounts, paths);
    expect(seed.stories.find((story) => story.photo_path === paths["RAINY7Q"])?.photo_box).toBeNull();
  } finally {
    if (box) SEED_PHOTO_BOXES["RAINY7Q"] = box;
  }
});

it("rejects a missing story author's account mapping", () => {
  const incomplete = { ...accounts };
  delete incomplete["FogLightFan"];
  expect(() => buildSeed("2026-10-17", incomplete, paths)).toThrow(
    "Seed account mapping is incomplete.",
  );
});

it("rejects a missing mapping for one required photo", () => {
  const incomplete = { ...paths };
  delete incomplete["EH2ZED"];
  expect(() => buildSeed("2026-10-17", accounts, incomplete)).toThrow(
    "Seed photo mapping is incomplete.",
  );
});

it("shifts every scenario timestamp and featured date for a different demo_today", () => {
  const seed = buildSeed("2026-11-01", accounts, paths);
  expect(seed.stories[0]?.created_at).toBe("2026-10-28T16:10:00.000Z");
  expect(seed.featured_days.map((row) => row.day)).toEqual([
    "2026-10-28",
    "2026-10-29",
    "2026-10-30",
    "2026-10-31",
    "2026-11-01",
  ]);
  expect(seed.stories.find((row) => row.status === "pending")?.created_at).toBe(
    "2026-10-31T17:30:00.000Z",
  );
  expect(seed.stories.find((row) => row.status === "rejected")?.created_at).toBe(
    "2026-11-01T00:15:00.000Z",
  );
  const baseline = buildSeed("2026-10-17", accounts, paths);
  for (const table of [
    "subjects",
    "stories",
    "summaries",
    "hearts",
    "notifications",
    "reports",
  ] as const) {
    seed[table].forEach((row, index) => {
      for (const field of ["created_at", "published_at", "started_at", "generated_at"] as const) {
        const current = (row as Record<string, unknown>)[field];
        const previous = (baseline[table][index] as Record<string, unknown>)[field];
        if (typeof current === "string" && typeof previous === "string")
          expect(Date.parse(current) - Date.parse(previous)).toBe(15 * 86_400_000);
      }
    });
  }
});
