import { beforeEach, describe, expect, it, vi } from "vitest";

const f = await vi.hoisted(async () => {
  const { fakeSupabase } = await import("./fake-supabase");
  return {
    db: fakeSupabase(),
    checkSubject: vi.fn(),
    checkStory: vi.fn(),
    persist: vi.fn(),
    guess: vi.fn((id: string) => `guess:${id}`),
    refresh: vi.fn((id: string) => `refresh:${id}`),
    after: vi.fn(),
  };
});
vi.mock("@/lib/plate-moderation.server", () => ({ checkSubject: f.checkSubject }));
vi.mock("@/lib/story-moderation.server", () => ({ checkStory: f.checkStory }));
vi.mock("@/lib/ai-block.server", () => ({ persistAiBlock: f.persist }));
vi.mock("@/lib/plate-guesses.server", () => ({ requestPlateGuess: f.guess }));
vi.mock("@/lib/summary-refresh.server", () => ({ requestSummaryRefresh: f.refresh }));
vi.mock("@/lib/after-response.server", () => ({ runAfterResponse: f.after }));

import { recheckStory, recheckSubject } from "@/lib/recheck.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const admin = f.db.client as unknown as SupabaseClient<Database>;
const subject = { id: "p1", identity_a: "US-WA", identity_b: "abc", name: "Washington" };
const story = {
  id: "s1",
  subject_id: "p1",
  meaning: "M",
  body: null,
  plateText: "ABC",
  photo_path: null as string | null,
};
const photoStory = { ...story, photo_path: "author/11111111-1111-1111-1111-111111111111.jpg" };
const photoBlob = { arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer) };

beforeEach(() => {
  f.db.reset();
  for (const fn of [f.checkSubject, f.checkStory, f.persist, f.after]) fn.mockReset();
});

describe("recheckSubject", () => {
  it("publishes, requests a guess and notifies the owner", async () => {
    f.checkSubject.mockResolvedValue({ outcome: "approved" });
    f.db.queue("subjects", { data: [{ id: "p1" }], error: null });
    expect(await recheckSubject(admin, subject, "owner")).toBe("published");
    expect(f.checkSubject).toHaveBeenCalledWith("Washington", "abc");
    expect(f.after).toHaveBeenCalledWith("guess:p1");
    expect(f.db.ops("notifications")[0]?.[0]?.[1]).toEqual([
      { user_id: "owner", kind: "subject_published", subject_id: "p1" },
    ]);
  });
  it("rejects without a guess, and skips the notice when there is no owner", async () => {
    f.checkSubject.mockResolvedValue({ outcome: "rejected" });
    f.db.queue("subjects", { data: [{ id: "p1" }], error: null });
    expect(await recheckSubject(admin, subject, null)).toBe("rejected");
    expect(f.after).not.toHaveBeenCalled();
    expect(f.db.ops("notifications")).toEqual([]);
  });
  it("notifies a rejected owner, and does nothing more when the row already changed", async () => {
    f.checkSubject.mockResolvedValue({ outcome: "rejected" });
    f.db.queue("subjects", { data: [{ id: "p1" }], error: null });
    await recheckSubject(admin, subject, "owner");
    expect(f.db.ops("notifications")[0]?.[0]?.[1]).toEqual([
      { user_id: "owner", kind: "subject_rejected", subject_id: "p1" },
    ]);
    f.db.reset();
    f.checkSubject.mockResolvedValue({ outcome: "approved" });
    f.db.queue("subjects", { data: null, error: null });
    expect(await recheckSubject(admin, subject, "owner")).toBe("unchanged");
    expect(f.db.ops("notifications")).toEqual([]);
  });
  it("stops on unavailable without a block", async () => {
    f.checkSubject.mockResolvedValue({ outcome: "unavailable" });
    expect(await recheckSubject(admin, subject, "owner")).toBe("unavailable");
    expect(f.persist).not.toHaveBeenCalled();
    expect(f.db.ops("subjects")).toEqual([]);
  });
  it("persists a block through the shared pause and stops, even with an approval", async () => {
    f.checkSubject.mockResolvedValue({ outcome: "approved", block: "credit", runId: "r" });
    expect(await recheckSubject(admin, subject, "owner")).toBe("blocked");
    expect(f.persist).toHaveBeenCalledWith(admin, "credit", "r");
    expect(f.db.ops("subjects")).toEqual([]);
  });
});

describe("recheckStory", () => {
  it("publishes, notifies and refreshes the summary", async () => {
    f.checkStory.mockResolvedValue({ outcome: "approved" });
    f.db.queue("stories", { data: [{ id: "s1" }], error: null });
    expect(await recheckStory(admin, story, "author")).toBe("published");
    expect(f.checkStory).toHaveBeenCalledWith("M", "", "ABC", undefined);
    expect(f.after).toHaveBeenCalledWith("refresh:p1");
    expect(f.db.ops("notifications")[0]?.[0]?.[1]).toEqual([
      { user_id: "author", kind: "story_published", subject_id: "p1", story_id: "s1" },
    ]);
  });
  it("rejects with a notice and no refresh; no owner means no notice", async () => {
    f.checkStory.mockResolvedValue({ outcome: "rejected" });
    f.db.queue("stories", { data: [{ id: "s1" }], error: null });
    expect(await recheckStory(admin, { ...story, body: "more" }, "author")).toBe("rejected");
    expect(f.checkStory).toHaveBeenCalledWith("M", "more", "ABC", undefined);
    expect(f.db.ops("notifications")[0]?.[0]?.[1]).toEqual([
      { user_id: "author", kind: "story_rejected", subject_id: "p1", story_id: "s1" },
    ]);
    expect(f.after).not.toHaveBeenCalled();
    f.db.reset();
    f.db.queue("stories", { data: [{ id: "s1" }], error: null });
    await recheckStory(admin, story, null);
    expect(f.db.ops("notifications")).toEqual([]);
  });
  it("does nothing more when the row already changed", async () => {
    f.checkStory.mockResolvedValue({ outcome: "approved" });
    f.db.queue("stories", { data: [], error: null });
    expect(await recheckStory(admin, story, "author")).toBe("unchanged");
    f.db.queue("stories", { data: null, error: { m: 1 } });
    expect(await recheckStory(admin, story, "author")).toBe("unchanged");
    expect(f.after).not.toHaveBeenCalled();
  });
  it("stops on unavailable without a block", async () => {
    f.checkStory.mockResolvedValue({ outcome: "unavailable" });
    expect(await recheckStory(admin, story, "author")).toBe("unavailable");
    expect(f.persist).not.toHaveBeenCalled();
  });
  it("persists a block and stops", async () => {
    f.checkStory.mockResolvedValue({ outcome: "unavailable", block: "denied", runId: "r" });
    expect(await recheckStory(admin, story, "author")).toBe("blocked");
    expect(f.persist).toHaveBeenCalledWith(admin, "denied", "r");
  });
});
