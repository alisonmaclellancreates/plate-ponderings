import { expect, it } from "vitest";
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
    seed.notifications.every((n) => n.read_at === null && n.user_id === accounts.Traveler4821),
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
