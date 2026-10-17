import { beforeEach, describe, expect, it, vi } from "vitest";

const f = await vi.hoisted(async () => {
  const { fakeSupabase } = await import("./fake-supabase");
  return {
    db: fakeSupabase(),
    block: vi.fn(),
    subject: vi.fn(),
    story: vi.fn(),
    refresh: vi.fn((id: string) => `refresh:${id}`),
    after: vi.fn(),
  };
});
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: f.db.client }));
vi.mock("@/lib/ai-block.server", () => ({ readAiBlock: f.block }));
vi.mock("@/lib/recheck.server", () => ({ recheckSubject: f.subject, recheckStory: f.story }));
vi.mock("@/lib/summary-refresh.server", () => ({ requestSummaryRefresh: f.refresh }));
vi.mock("@/lib/after-response.server", () => ({ runAfterResponse: f.after }));
vi.mock("@tanstack/react-start", async () => {
  const { serverFnMock } = await import("./fake-supabase");
  return serverFnMock(() => ({ userId: "me", supabase: f.db.client }));
});

import {
  getAdminAccess,
  getReportedStories,
  recheckAllPending,
  RECHECK_CAP,
  setStoryHidden,
} from "@/lib/admin.functions";

const admin = (yes: boolean | null, error: unknown = null) =>
  f.db.rpc.mockImplementation((fn: string) =>
    Promise.resolve(fn === "has_role" ? { data: yes, error } : { data: [], error: null }),
  );

beforeEach(() => {
  f.db.reset();
  for (const fn of [f.block, f.subject, f.story, f.after]) fn.mockReset();
  admin(true);
  f.block.mockResolvedValue({ category: null });
});

describe("admin access is decided by has_role on the caller's client", () => {
  it("reports admin and not admin", async () => {
    expect(await getAdminAccess()).toEqual({ admin: true });
    expect(f.db.rpc).toHaveBeenCalledWith("has_role", { _user_id: "me", _role: "admin" });
    admin(false);
    expect(await getAdminAccess()).toEqual({ admin: false });
    admin(true, { message: "x" });
    expect(await getAdminAccess()).toEqual({ admin: false });
  });
  it("refuses every admin action for non-admins", async () => {
    admin(false);
    await expect(getReportedStories()).rejects.toThrow("Admins only.");
    expect(await setStoryHidden({ data: { storyId: "s", hidden: true } })).toEqual({
      outcome: "forbidden",
    });
    expect(await recheckAllPending()).toEqual({ outcome: "forbidden" });
    expect(f.db.calls).toEqual([]);
  });
});

describe("getReportedStories", () => {
  it("maps reported rows newest first as returned", async () => {
    f.db.rpc.mockImplementation((fn: string) =>
      Promise.resolve(
        fn === "has_role"
          ? { data: true, error: null }
          : {
              data: [
                {
                  story_id: "s1",
                  jurisdiction: "Utah",
                  plate_text: "CANYONS",
                  handle: "maplegirl",
                  meaning: "M",
                  report_count: 2,
                  reasons: ["spam"],
                  status: "published",
                },
                {
                  story_id: "s2",
                  jurisdiction: "Utah",
                  plate_text: "ARCHES",
                  handle: "Traveler",
                  meaning: "N",
                  report_count: 1,
                  reasons: ["other"],
                  status: "hidden",
                },
              ],
              error: null,
            },
      ),
    );
    expect(await getReportedStories()).toEqual([
      {
        id: "s1",
        jurisdiction: "Utah",
        text: "CANYONS",
        handle: "maplegirl",
        meaning: "M",
        reports: 2,
        reasons: ["spam"],
        status: "visible",
      },
      {
        id: "s2",
        jurisdiction: "Utah",
        text: "ARCHES",
        handle: "Traveler",
        meaning: "N",
        reports: 1,
        reasons: ["other"],
        status: "hidden",
      },
    ]);
  });
  it("throws on a read error", async () => {
    f.db.rpc.mockImplementation((fn: string) =>
      Promise.resolve(
        fn === "has_role" ? { data: true, error: null } : { data: null, error: { message: "x" } },
      ),
    );
    await expect(getReportedStories()).rejects.toThrow("We couldn't load reported stories.");
  });
});

describe("setStoryHidden", () => {
  it("hides a published story without touching published_at and refreshes the summary", async () => {
    f.db.queue("stories", { data: [{ subject_id: "p1" }], error: null });
    expect(await setStoryHidden({ data: { storyId: "s1", hidden: true } })).toEqual({
      outcome: "done",
    });
    const ops = f.db.ops("stories")[0];
    const patch = ops?.[0]?.[1][0] as Record<string, unknown>;
    expect(patch["status"]).toBe("hidden");
    expect(typeof patch["removed_at"]).toBe("string");
    expect(patch).not.toHaveProperty("published_at");
    expect(ops).toContainEqual(["eq", ["status", "published"]]);
    expect(f.after).toHaveBeenCalledWith("refresh:p1");
  });
  it("unhides a hidden story back to published and refreshes the summary", async () => {
    f.db.queue("stories", { data: [{ subject_id: "p2" }], error: null });
    expect(await setStoryHidden({ data: { storyId: "s1", hidden: false } })).toEqual({
      outcome: "done",
    });
    const ops = f.db.ops("stories")[0];
    expect(ops?.[0]).toEqual(["update", [{ status: "published", removed_at: null }]]);
    expect(ops).toContainEqual(["eq", ["status", "hidden"]]);
    expect(f.after).toHaveBeenCalledWith("refresh:p2");
  });
  it.each([
    ["an update error", { data: null, error: { message: "x" } }],
    ["no matching row", { data: [], error: null }],
  ])("reports %s without a refresh", async (_l, result) => {
    f.db.queue("stories", result);
    expect(await setStoryHidden({ data: { storyId: 1, hidden: "y" } as unknown as never })).toEqual(
      { outcome: "error" },
    );
    expect(f.after).not.toHaveBeenCalled();
  });
});

describe("recheckAllPending", () => {
  const subjectRow = (id: string, owner: string | null, j: { name: string } | null = null) => ({
    id,
    identity_a: "US-WA",
    identity_b: id,
    created_by: owner,
    jurisdictions: j,
  });
  const storyRow = (id: string, owner: string | null, s: { identity_b: string } | null = null) => ({
    id,
    subject_id: "p",
    meaning: "M",
    body: null,
    author_id: owner,
    subjects: s,
  });

  it("checks the shared AI pause before starting", async () => {
    f.block.mockResolvedValue({ category: "credit_block" });
    expect(await recheckAllPending()).toEqual({ outcome: "paused" });
    f.block.mockResolvedValue(null);
    expect(await recheckAllPending()).toEqual({ outcome: "error" });
    expect(f.subject).not.toHaveBeenCalled();
  });
  it("reports read errors", async () => {
    f.db.queue("user_roles", { data: null, error: { message: "x" } });
    expect(await recheckAllPending()).toEqual({ outcome: "error" });
    f.db.queue("subjects", { data: null, error: { message: "x" } });
    expect(await recheckAllPending()).toEqual({ outcome: "error" });
    f.db.queue("stories", { data: null, error: { message: "x" } });
    expect(await recheckAllPending()).toEqual({ outcome: "error" });
  });
  it("skips the demo account, does plates then stories, and passes each owner", async () => {
    f.db.queue("user_roles", { data: [{ user_id: "demo" }], error: null });
    f.db.queue("subjects", {
      data: [subjectRow("p1", "a", { name: "Washington" }), subjectRow("p2", "demo")],
      error: null,
    });
    f.db.queue("stories", {
      data: [storyRow("s1", null, { identity_b: "ABC" }), storyRow("s2", "demo")],
      error: null,
    });
    f.subject.mockResolvedValue("published");
    f.story.mockResolvedValue("rejected");
    expect(await recheckAllPending()).toEqual({
      outcome: "done",
      changed: 2,
      remaining: 0,
      stopped: false,
    });
    expect(f.subject).toHaveBeenCalledTimes(1);
    expect(f.subject.mock.calls[0]?.[1]).toMatchObject({ id: "p1", name: "Washington" });
    expect(f.subject.mock.calls[0]?.[2]).toBe("a");
    expect(f.story).toHaveBeenCalledTimes(1);
    expect(f.story.mock.calls[0]?.[1]).toMatchObject({ id: "s1", plateText: "ABC" });
    expect(f.story.mock.calls[0]?.[2]).toBeNull();
  });
  it(`processes at most ${RECHECK_CAP} items per click and reports how many remain`, async () => {
    f.db.queue("subjects", {
      data: Array.from({ length: 8 }, (_, i) => subjectRow(`p${i}`, "a")),
      error: null,
    });
    f.db.queue("stories", {
      data: Array.from({ length: 5 }, (_, i) => storyRow(`s${i}`, "a")),
      error: null,
    });
    f.subject.mockResolvedValue("published");
    f.story.mockResolvedValue("published");
    expect(await recheckAllPending()).toEqual({
      outcome: "done",
      changed: 10,
      remaining: 3,
      stopped: false,
    });
    expect(f.subject).toHaveBeenCalledTimes(8);
    expect(f.story).toHaveBeenCalledTimes(2);
    expect(f.subject.mock.calls[0]?.[1]).toMatchObject({ name: "US-WA" });
    expect(f.story.mock.calls[0]?.[1]).toMatchObject({ plateText: "" });
  });
  it("stops on the first unavailable or block result", async () => {
    f.db.queue("subjects", {
      data: [subjectRow("p1", "a"), subjectRow("p2", "a"), subjectRow("p3", "a")],
      error: null,
    });
    f.subject.mockResolvedValueOnce("rejected").mockResolvedValueOnce("unavailable");
    expect(await recheckAllPending()).toEqual({
      outcome: "done",
      changed: 1,
      remaining: 2,
      stopped: true,
    });
    expect(f.subject).toHaveBeenCalledTimes(2);
  });
});
