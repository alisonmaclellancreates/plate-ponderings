import { beforeEach, expect, it, vi } from "vitest";

const f = await vi.hoisted(async () => {
  const { fakeSupabase } = await import("./fake-supabase");
  return { db: fakeSupabase(), refresh: vi.fn((id: string) => `refresh:${id}`), after: vi.fn() };
});
vi.mock("@/lib/summary-refresh.server", () => ({ requestSummaryRefresh: f.refresh }));
vi.mock("@/lib/after-response.server", () => ({ runAfterResponse: f.after }));

import { tombstoneStories } from "@/lib/tombstone.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const admin = f.db.client as unknown as SupabaseClient<Database>;

beforeEach(() => {
  f.db.reset();
  f.refresh.mockClear();
  f.after.mockClear();
});

it("tombstones with published_at kept, erases text and photo, removes hearts and refreshes", async () => {
  f.db.queue(
    "stories",
    {
      data: [
        { id: "s1", subject_id: "p1", photo_path: "me/a.jpg" },
        { id: "s2", subject_id: "p1", photo_path: null },
      ],
      error: null,
    },
    {
      data: [
        { id: "s1", subject_id: "p1" },
        { id: "s2", subject_id: "p1" },
      ],
      error: null,
    },
  );
  expect(await tombstoneStories(admin, { ids: ["s1", "s2"], authorId: "me" })).toEqual(["p1"]);
  const [read, update] = f.db.ops("stories");
  expect(read).toContainEqual(["in", ["status", ["published", "hidden"]]]);
  expect(read).toContainEqual(["in", ["id", ["s1", "s2"]]]);
  const patch = update?.[0]?.[1][0] as Record<string, unknown>;
  expect(patch).toMatchObject({ status: "deleted", meaning: "", body: null, photo_path: null, photo_box: null });
  expect(patch).not.toHaveProperty("published_at");
  expect(typeof patch["removed_at"]).toBe("string");
  expect(update).toContainEqual(["eq", ["author_id", "me"]]);
  expect(f.db.ops("hearts")[0]).toEqual([
    ["delete", []],
    ["in", ["story_id", ["s1", "s2"]]],
  ]);
  expect(f.db.storage.buckets).toEqual(["story-photos"]);
  expect(f.db.storage.remove).toHaveBeenCalledWith(["me/a.jpg"]);
  expect(f.after).toHaveBeenCalledWith("refresh:p1");
});

it("reads every published or hidden story of the author when no ids are given", async () => {
  f.db.queue(
    "stories",
    { data: [{ id: "s1", subject_id: "p1", photo_path: null }], error: null },
    { data: [{ id: "s1", subject_id: "p1" }], error: null },
  );
  expect(await tombstoneStories(admin, { authorId: "me" })).toEqual(["p1"]);
  expect(f.db.ops("stories")[0]?.some(([op, a]) => op === "in" && a[0] === "id")).toBe(false);
  expect(f.db.storage.remove).not.toHaveBeenCalled();
});

it("returns null on a read or update error, and [] when nothing matches", async () => {
  f.db.queue("stories", { data: null, error: { message: "x" } });
  expect(await tombstoneStories(admin, { authorId: "me" })).toBeNull();
  f.db.queue("stories", { data: [], error: null });
  expect(await tombstoneStories(admin, { authorId: "me" })).toEqual([]);
  f.db.queue(
    "stories",
    { data: [{ id: "s1", subject_id: "p1", photo_path: null }], error: null },
    { data: null, error: { message: "x" } },
  );
  expect(await tombstoneStories(admin, { authorId: "me" })).toBeNull();
  f.db.queue(
    "stories",
    { data: [{ id: "s1", subject_id: "p1", photo_path: "me/a.jpg" }], error: null },
    { data: [], error: null },
  );
  expect(await tombstoneStories(admin, { authorId: "me" })).toEqual([]);
  expect(f.db.ops("hearts")).toEqual([]);
  expect(f.after).not.toHaveBeenCalled();
});
