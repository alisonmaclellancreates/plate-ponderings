import { beforeEach, describe, expect, it, vi } from "vitest";

const f = await vi.hoisted(async () => {
  const { fakeSupabase } = await import("./fake-supabase");
  return { db: fakeSupabase(), tombstone: vi.fn() };
});

vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: f.db.client }));
vi.mock("@/lib/tombstone.server", () => ({ tombstoneStories: f.tombstone }));
vi.mock("@tanstack/react-start", async () => {
  const { serverFnMock } = await import("./fake-supabase");
  return serverFnMock(() => ({ userId: "me", supabase: f.db.client }));
});

import {
  blockAuthor,
  deleteMyStory,
  getBlockedPeople,
  reportStory,
  toggleHeart,
  unblockUser,
} from "@/lib/story-actions.functions";
import { DEMO_MESSAGE } from "@/lib/account-rules";

const role = (demo: boolean | null, error: unknown = null) =>
  f.db.rpc.mockResolvedValue({ data: demo, error });

beforeEach(() => {
  f.db.reset();
  f.tombstone.mockReset();
  role(false);
});

describe("every write refuses the demo account and role errors first", () => {
  const writes = [
    () => toggleHeart({ data: { storyId: "s", hearted: true } }),
    () => reportStory({ data: { storyId: "s", reason: "spam", note: "" } }),
    () => blockAuthor({ data: { storyId: "s" } }),
    () => unblockUser({ data: { key: "k" } }),
    () => deleteMyStory({ data: { storyId: "s" } }),
  ];
  it.each(writes.map((w, i) => [i, w] as const))("write %i: demo", async (_i, write) => {
    role(true);
    expect(await write()).toEqual({ outcome: "demo", message: DEMO_MESSAGE });
    expect(f.db.calls).toEqual([]);
  });
  it.each(writes.map((w, i) => [i, w] as const))("write %i: role error", async (_i, write) => {
    role(null, { message: "x" });
    expect(await write()).toEqual({ outcome: "error" });
  });
});

describe("toggleHeart", () => {
  it("adds one heart per person, ignoring duplicates", async () => {
    expect(await toggleHeart({ data: { storyId: "s1", hearted: true } })).toEqual({
      outcome: "done",
    });
    expect(f.db.ops("hearts")[0]?.[0]).toEqual([
      "upsert",
      [
        { story_id: "s1", user_id: "me" },
        { onConflict: "story_id,user_id", ignoreDuplicates: true },
      ],
    ]);
  });
  it("removes only the caller's heart when tapped again", async () => {
    await toggleHeart({ data: { storyId: "s1", hearted: false } });
    expect(f.db.ops("hearts")[0]).toEqual([
      ["delete", []],
      ["eq", ["story_id", "s1"]],
      ["eq", ["user_id", "me"]],
    ]);
  });
  it("reports a write error and coerces bad input", async () => {
    f.db.queue("hearts", { error: { message: "rls" } });
    expect(
      await toggleHeart({ data: { storyId: 5, hearted: "yes" } as unknown as never }),
    ).toEqual({ outcome: "error" });
    expect(f.db.ops("hearts")[0]?.[0]).toEqual(["delete", []]);
  });
});

describe("reportStory", () => {
  it("records the reason key and trimmed note", async () => {
    expect(
      await reportStory({ data: { storyId: "s1", reason: "harassment", note: "  rude  " } }),
    ).toEqual({ outcome: "done" });
    expect(f.db.ops("reports")[0]?.[0]).toEqual([
      "insert",
      [{ story_id: "s1", reporter_id: "me", reason: "harassment", note: "rude" }],
    ]);
  });
  it("stores an empty note as null", async () => {
    await reportStory({ data: { storyId: "s1", reason: "other", note: "   " } });
    expect(f.db.ops("reports")[0]?.[0]?.[1]).toEqual([
      { story_id: "s1", reporter_id: "me", reason: "other", note: null },
    ]);
  });
  it("refuses unknown reasons and notes over 200 characters", async () => {
    expect(await reportStory({ data: { storyId: "s", reason: "rude", note: "" } })).toEqual({
      outcome: "validation",
    });
    expect(
      await reportStory({ data: { storyId: "s", reason: "spam", note: "x".repeat(201) } }),
    ).toEqual({ outcome: "validation" });
    expect(
      await reportStory({ data: { storyId: 1, reason: 2, note: 3 } as unknown as never }),
    ).toEqual({ outcome: "validation" });
  });
  it("allows one report per person per story", async () => {
    f.db.queue("reports", { error: { code: "23505" } });
    expect(await reportStory({ data: { storyId: "s", reason: "spam", note: "" } })).toEqual({
      outcome: "already",
    });
  });
  it("reports other write errors", async () => {
    f.db.queue("reports", { error: { code: "42501" } });
    expect(await reportStory({ data: { storyId: "s", reason: "spam", note: "" } })).toEqual({
      outcome: "error",
    });
  });
});

describe("blockAuthor", () => {
  it("resolves the author from the published story on the server", async () => {
    f.db.queue("stories", { data: { author_id: "them" }, error: null });
    expect(await blockAuthor({ data: { storyId: "s1" } })).toEqual({ outcome: "done" });
    expect(f.db.ops("stories")[0]).toContainEqual(["eq", ["status", "published"]]);
    expect(f.db.ops("blocks")[0]?.[0]).toEqual([
      "upsert",
      [
        { blocker_id: "me", blocked_id: "them" },
        { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
      ],
    ]);
  });
  it.each([
    ["a read error", { data: null, error: { message: "x" } }],
    ["a missing story", { data: null, error: null }],
    ["an authorless story", { data: { author_id: null }, error: null }],
    ["the caller's own story", { data: { author_id: "me" }, error: null }],
  ])("refuses %s", async (_label, row) => {
    f.db.queue("stories", row);
    expect(await blockAuthor({ data: { storyId: "s1" } })).toEqual({ outcome: "error" });
    expect(f.db.ops("blocks")).toEqual([]);
  });
  it("reports a block write error", async () => {
    f.db.queue("stories", { data: { author_id: "them" }, error: null });
    f.db.queue("blocks", { error: { message: "x" } });
    expect(await blockAuthor({ data: { storyId: 7 } as unknown as never })).toEqual({
      outcome: "error",
    });
  });
});

describe("getBlockedPeople and unblockUser", () => {
  it("lists the caller's blocks with handles, Traveler when gone", async () => {
    f.db.queue("blocks", { data: [{ blocked_id: "a" }, { blocked_id: "b" }], error: null });
    f.db.queue("profiles", { data: [{ id: "a", handle: "maplegirl" }], error: null });
    expect(await getBlockedPeople()).toEqual([
      { key: "a", handle: "maplegirl" },
      { key: "b", handle: "Traveler" },
    ]);
    expect(f.db.ops("blocks")[0]).toContainEqual(["eq", ["blocker_id", "me"]]);
  });
  it("returns none without a profile read, and tolerates a missing profile result", async () => {
    expect(await getBlockedPeople()).toEqual([]);
    expect(f.db.ops("profiles")).toEqual([]);
    f.db.queue("blocks", { data: [{ blocked_id: "a" }], error: null });
    f.db.queue("profiles", { data: null, error: { message: "x" } });
    expect(await getBlockedPeople()).toEqual([{ key: "a", handle: "Traveler" }]);
  });
  it("throws on a block read error", async () => {
    f.db.queue("blocks", { data: null, error: { message: "x" } });
    await expect(getBlockedPeople()).rejects.toThrow("We couldn't load your blocked people.");
  });
  it("unblocks only the caller's own block", async () => {
    expect(await unblockUser({ data: { key: "a" } })).toEqual({ outcome: "done" });
    expect(f.db.ops("blocks")[0]).toEqual([
      ["delete", []],
      ["eq", ["blocker_id", "me"]],
      ["eq", ["blocked_id", "a"]],
    ]);
    f.db.queue("blocks", { error: { message: "x" } });
    expect(await unblockUser({ data: { key: 1 } as unknown as never })).toEqual({
      outcome: "error",
    });
  });
});

describe("deleteMyStory", () => {
  it("tombstones only the caller's story", async () => {
    f.tombstone.mockResolvedValue(["p1"]);
    expect(await deleteMyStory({ data: { storyId: "s1" } })).toEqual({ outcome: "done" });
    expect(f.tombstone).toHaveBeenCalledWith(f.db.client, { ids: ["s1"], authorId: "me" });
  });
  it.each([
    ["a read error", null],
    ["nothing matched", []],
  ])("reports an error for %s", async (_l, result) => {
    f.tombstone.mockResolvedValue(result);
    expect(await deleteMyStory({ data: { storyId: "s1" } })).toEqual({ outcome: "error" });
  });
});
