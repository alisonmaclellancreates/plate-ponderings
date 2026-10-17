import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: { from: vi.fn(), rpc: vi.fn() },
  check: vi.fn(),
  checkStory: vi.fn(),
  refresh: vi.fn(),
  readBlock: vi.fn(),
  persistBlock: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (data: unknown) => data;
    const builder = {
      middleware: () => builder,
      inputValidator: (fn: (data: unknown) => unknown) => {
        validate = fn;
        return builder;
      },
      handler:
        (fn: (args: { data: unknown; context: unknown }) => unknown) =>
        (args: { data: unknown; context: unknown }) =>
          fn({ ...args, data: validate(args.data) }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: mocks.admin }));
vi.mock("@/lib/plate-moderation.server", () => ({ checkSubject: mocks.check }));
vi.mock("@/lib/story-moderation.server", () => ({ checkStory: mocks.checkStory }));
vi.mock("@/lib/summary-refresh.server", () => ({ requestSummaryRefresh: mocks.refresh }));
vi.mock("@/lib/ai-block.server", () => ({
  readAiBlock: mocks.readBlock,
  persistAiBlock: mocks.persistBlock,
}));

import { searchPlate, getPlate, spotPlate, recheckPendingSubjects } from "@/lib/plates.functions";
import { RATE_LIMIT_MESSAGE } from "@/lib/account-rules";

type Result = { data: unknown; error: unknown };

/** A chainable query mock; terminal methods resolve `result`. */
function chain(result: Result) {
  const b: Record<string, unknown> = {};
  for (const name of ["select", "eq", "in", "neq", "insert", "update"]) b[name] = vi.fn(() => b);
  b["maybeSingle"] = vi.fn(async () => result);
  b["single"] = vi.fn(async () => result);
  b["then"] = (resolve: (r: Result) => void) => resolve(result);
  return b;
}

const JURISDICTION = { data: { code: "US-WA" }, error: null };
const PUBLISHED = {
  data: {
    id: "plate-1",
    identity_a: "US-WA",
    identity_b: "B7K2L9",
    status: "published",
    created_by: "someone",
    jurisdictions: { name: "Washington" },
  },
  error: null,
};

const context = { userId: "caller", supabase: { rpc: vi.fn(), from: vi.fn() } };

async function call(fn: unknown, data: unknown = { jurisdiction: "Washington", text: "B7K 2L9" }) {
  return await (fn as (a: unknown) => Promise<Record<string, unknown>>)({ data, context });
}

let tables: Record<string, Result>;
let insertResult: Result;

beforeEach(() => {
  vi.clearAllMocks();
  tables = {
    jurisdictions: JURISDICTION,
    subjects: { data: null, error: null },
    app_settings: { data: { ai_check_block_category: null }, error: null },
    profiles: { data: { last_recheck_at: null }, error: null },
    notifications: { data: null, error: null },
  };
  insertResult = { data: { id: "plate-1", identity_b: "B7K2L9" }, error: null };
  mocks.admin.from.mockImplementation((table: string) => {
    const c = chain(tables[table] ?? { data: null, error: null });
    if (table === "subjects" || table === "profiles") {
      c["insert"] = vi.fn(() =>
        chain(table === "subjects" ? insertResult : { data: null, error: null }),
      );
      c["update"] = vi.fn(() => chain({ data: [{ id: "row-1" }], error: null }));
    }
    return c;
  });
  mocks.admin.rpc.mockResolvedValue({ data: true, error: null });
  context.supabase.rpc.mockResolvedValue({ data: false, error: null });
  context.supabase.from.mockImplementation(() =>
    chain({ data: { last_recheck_at: null }, error: null }),
  );
  mocks.readBlock.mockResolvedValue({ category: null, blockedAt: null });
  mocks.persistBlock.mockResolvedValue(undefined);
  mocks.check.mockResolvedValue({ outcome: "approved", block: null, runId: "run-1" });
  mocks.checkStory.mockResolvedValue({ outcome: "approved", block: null, runId: "run-1" });
  mocks.refresh.mockResolvedValue(undefined);
});

describe("searchPlate", () => {
  it("normalizes non-string input before validation", async () => {
    expect(await call(searchPlate, { jurisdiction: 42, text: null })).toEqual({
      status: "no-match",
    });
    expect(mocks.admin.from).not.toHaveBeenCalled();
  });
  it("distinguishes a jurisdiction database failure from a missing plate", async () => {
    tables["jurisdictions"] = { data: null, error: { message: "offline" } };
    expect(await call(searchPlate)).toEqual({ status: "error" });
  });
  it("uses the jurisdiction code when the optional join is absent", async () => {
    tables["subjects"] = { data: { ...PUBLISHED.data, jurisdictions: null }, error: null };
    expect(await call(searchPlate)).toEqual({
      status: "found",
      plate: { id: "plate-1", jurisdiction: "US-WA", text: "B7K2L9" },
    });
  });
  it("returns only the fields the page needs, never created_by", async () => {
    tables["subjects"] = PUBLISHED;
    const result = await call(searchPlate);
    expect(result).toEqual({
      status: "found",
      plate: { id: "plate-1", jurisdiction: "Washington", text: "B7K2L9" },
    });
    expect(JSON.stringify(result)).not.toContain("created_by");
  });
  it("treats invalid input and missing plates as no-match", async () => {
    expect(await call(searchPlate, { jurisdiction: "", text: "" })).toEqual({
      status: "no-match",
    });
    expect(await call(searchPlate)).toEqual({ status: "no-match" });
  });
  it("reports error, not no-match, when the server read fails", async () => {
    tables["jurisdictions"] = { data: null, error: null };
    expect(await call(searchPlate)).toEqual({ status: "error" });
    tables["jurisdictions"] = JURISDICTION;
    tables["subjects"] = { data: null, error: {} };
    expect(await call(searchPlate)).toEqual({ status: "error" });
  });
});

describe("getPlate", () => {
  it("sanitizes non-string ids and falls back to the jurisdiction code", async () => {
    const query = chain({ data: { ...PUBLISHED.data, jurisdictions: null }, error: null });
    mocks.admin.from.mockReturnValue(query);
    expect(await call(getPlate, { id: 42 })).toEqual({
      plate: { id: "plate-1", jurisdiction: "US-WA", text: "B7K2L9" },
    });
    expect(query["eq"]).toHaveBeenCalledWith("id", "");
  });
  it("returns a published plate or null", async () => {
    tables["subjects"] = PUBLISHED;
    expect(await call(getPlate, { id: "plate-1" })).toEqual({
      plate: { id: "plate-1", jurisdiction: "Washington", text: "B7K2L9" },
    });
    tables["subjects"] = { data: null, error: null };
    expect(await call(getPlate, { id: "nope" })).toEqual({ plate: null });
    tables["subjects"] = { data: null, error: {} };
    expect(await call(getPlate, { id: "nope" })).toEqual({ plate: null });
  });
});

describe("spotPlate", () => {
  it("refuses failed role checks and invalid input before database access", async () => {
    context.supabase.rpc.mockResolvedValueOnce({ data: false, error: { message: "offline" } });
    expect(await call(spotPlate)).toEqual({ outcome: "error" });
    expect(await call(spotPlate, { jurisdiction: null, text: 42 })).toEqual({
      outcome: "validation",
    });
    expect(mocks.admin.from).not.toHaveBeenCalled();
  });
  it.each([null, { message: "offline" }])(
    "refuses a failed jurisdiction lookup (%j)",
    async (error) => {
      tables["jurisdictions"] = { data: null, error };
      expect(await call(spotPlate)).toEqual({ outcome: "error" });
      expect(mocks.admin.rpc).not.toHaveBeenCalled();
    },
  );
  it("refuses a failed existing-plate lookup without consuming an attempt", async () => {
    tables["subjects"] = { data: null, error: { message: "offline" } };
    expect(await call(spotPlate)).toEqual({ outcome: "error" });
    expect(mocks.admin.rpc).not.toHaveBeenCalled();
  });
  it("falls back to the jurisdiction code on an existing published plate", async () => {
    tables["subjects"] = { data: { ...PUBLISHED.data, jurisdictions: null }, error: null };
    expect(await call(spotPlate)).toEqual({
      outcome: "exists",
      plate: { id: "plate-1", jurisdiction: "US-WA", text: "B7K2L9" },
    });
  });
  it("stops before AI or insertion when the attempt or block read fails", async () => {
    mocks.admin.rpc.mockResolvedValueOnce({ data: null, error: { message: "offline" } });
    expect(await call(spotPlate)).toEqual({ outcome: "error" });
    mocks.readBlock.mockResolvedValue(null);
    expect(await call(spotPlate)).toEqual({ outcome: "error" });
    expect(mocks.check).not.toHaveBeenCalled();
  });
  it.each(["approved", "unavailable"])(
    "reports a non-unique insert failure after %s",
    async (outcome) => {
      mocks.check.mockResolvedValue({ outcome, block: null });
      insertResult = { data: null, error: { code: "XX000" } };
      expect(await call(spotPlate)).toEqual({ outcome: "error" });
    },
  );
  describe.each(["approved", "unavailable"])("unique conflict after %s", (outcome) => {
    it.each([
      [PUBLISHED, "exists"],
      [
        { data: { ...PUBLISHED.data, status: "pending", created_by: "caller" }, error: null },
        "pending",
      ],
      [
        { data: { ...PUBLISHED.data, status: "pending", created_by: "other" }, error: null },
        "already-spotted",
      ],
      [{ data: null, error: null }, "error"],
      [{ data: null, error: { message: "offline" } }, "error"],
    ])("returns the re-read outcome %s → %s", async (reread, expected) => {
      mocks.check.mockResolvedValue({ outcome, block: null });
      let reads = 0;
      const insert = vi.fn(() => chain({ data: null, error: { code: "23505" } }));
      mocks.admin.from.mockImplementation((table: string) => {
        if (table !== "subjects") return chain(tables[table] ?? { data: null, error: null });
        const query = chain({ data: null, error: null });
        query["maybeSingle"] = vi.fn(async () =>
          ++reads === 1 ? { data: null, error: null } : reread,
        );
        query["insert"] = insert;
        return query;
      });
      const result = await call(spotPlate);
      expect(result["outcome"]).toBe(expected);
      expect(reads).toBe(2);
      expect(insert).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(result)).not.toContain("created_by");
    });
  });
  it("refuses the demo account before any write", async () => {
    context.supabase.rpc.mockResolvedValue({ data: true, error: null });
    expect((await call(spotPlate))["outcome"]).toBe("demo");
    expect(mocks.admin.from).not.toHaveBeenCalled();
  });
  it("returns what is already true for the key", async () => {
    tables["subjects"] = PUBLISHED;
    expect((await call(spotPlate))["outcome"]).toBe("exists");
    tables["subjects"] = {
      data: { ...PUBLISHED.data, status: "pending", created_by: "caller" },
      error: null,
    };
    expect((await call(spotPlate))["outcome"]).toBe("pending");
    tables["subjects"] = {
      data: { ...PUBLISHED.data, status: "pending", created_by: "someone-else" },
      error: null,
    };
    expect((await call(spotPlate))["outcome"]).toBe("already-spotted");
    expect(mocks.check).not.toHaveBeenCalled();
  });
  it("rate limits after five spots in fifteen minutes", async () => {
    mocks.admin.rpc.mockResolvedValue({ data: false, error: null });
    expect(await call(spotPlate)).toEqual({ outcome: "rate-limited", message: RATE_LIMIT_MESSAGE });
    expect(mocks.check).not.toHaveBeenCalled();
  });
  it("publishes an approved plate and returns new", async () => {
    const result = await call(spotPlate);
    expect(result).toEqual({
      outcome: "new",
      plate: { id: "plate-1", jurisdiction: "Washington", text: "B7K2L9" },
    });
    expect(mocks.check).toHaveBeenCalledWith("Washington", "B7K 2L9");
  });
  it("returns rejected without inserting when the check fails", async () => {
    mocks.check.mockResolvedValue({ outcome: "rejected", block: null });
    expect((await call(spotPlate))["outcome"]).toBe("rejected");
  });
  it("saves pending without calling AI while the shared block is active", async () => {
    mocks.readBlock.mockResolvedValue({ category: "credit_block", blockedAt: "now" });
    expect((await call(spotPlate))["outcome"]).toBe("pending");
    expect(mocks.check).not.toHaveBeenCalled();
  });
  it("saves pending on a transient failure without persisting a block", async () => {
    mocks.check.mockResolvedValue({ outcome: "unavailable", block: null });
    expect((await call(spotPlate))["outcome"]).toBe("pending");
    expect(mocks.persistBlock).not.toHaveBeenCalled();
  });
  it("persists a terminal block and saves pending", async () => {
    mocks.check.mockResolvedValue({ outcome: "unavailable", block: "credit_block", runId: "r" });
    expect((await call(spotPlate))["outcome"]).toBe("pending");
    expect(mocks.persistBlock).toHaveBeenCalledWith(mocks.admin, "credit_block", "r");
  });
  it("a simultaneous spot re-reads the key instead of erroring", async () => {
    insertResult = { data: null, error: { code: "23505" } };
    // First lookup: nothing. Re-lookup after the conflict: now published.
    let lookups = 0;
    mocks.admin.from.mockImplementation((table: string) => {
      const c = chain(tables[table] ?? { data: null, error: null });
      if (table === "subjects") {
        c["maybeSingle"] = vi.fn(async () =>
          ++lookups === 1 ? { data: null, error: null } : PUBLISHED,
        );
        c["insert"] = vi.fn(() => chain(insertResult));
      }
      return c;
    });
    expect((await call(spotPlate))["outcome"]).toBe("exists");
  });
});

describe("recheckPendingSubjects", () => {
  const pendingRow = {
    id: "subj-1",
    identity_a: "US-WA",
    identity_b: "B7K2L9",
    jurisdictions: { name: "Washington" },
  };
  it("does nothing when the role or profile read fails", async () => {
    context.supabase.rpc.mockResolvedValueOnce({ data: false, error: { message: "offline" } });
    expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 0 });
    context.supabase.from.mockReturnValue(chain({ data: null, error: { message: "offline" } }));
    expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 0 });
    expect(mocks.admin.from).not.toHaveBeenCalled();
  });
  it("does nothing when the AI block read fails", async () => {
    mocks.readBlock.mockResolvedValue(null);
    expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 0 });
    expect(mocks.admin.from).not.toHaveBeenCalled();
    expect(mocks.check).not.toHaveBeenCalled();
  });
  it("does not check when the throttle timestamp cannot be saved", async () => {
    mocks.admin.from.mockReturnValue(chain({ data: null, error: { message: "offline" } }));
    expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 0 });
    expect(mocks.admin.from).toHaveBeenCalledTimes(1);
    expect(mocks.check).not.toHaveBeenCalled();
  });
  it.each([
    { data: [], error: null },
    { data: null, error: { message: "offline" } },
  ])("skips an empty or failed pending read (%j)", async (result) => {
    tables["subjects"] = result;
    expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 0 });
    expect(mocks.check).not.toHaveBeenCalled();
  });
  it.each([null, "provider_access_denied"])(
    "stops on unavailable with block %s after completed work",
    async (block) => {
      const updates = vi.fn(() => chain({ data: [{ id: "subj-1" }], error: null }));
      const notifications = vi.fn(() => chain({ data: null, error: null }));
      mocks.admin.from.mockImplementation((table: string) => {
        const c = chain(
          table === "subjects"
            ? {
                data: [
                  { ...pendingRow, jurisdictions: null },
                  { ...pendingRow, id: "subj-2" },
                  { ...pendingRow, id: "subj-3" },
                ],
                error: null,
              }
            : { data: null, error: null },
        );
        if (table === "subjects") c["update"] = updates;
        if (table === "notifications") c["insert"] = notifications;
        return c;
      });
      mocks.check
        .mockResolvedValueOnce({ outcome: "approved", block: null })
        .mockResolvedValueOnce({ outcome: "unavailable", block, runId: "r" });
      expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 1 });
      expect(mocks.check).toHaveBeenCalledTimes(2);
      expect(mocks.check).toHaveBeenNthCalledWith(1, "US-WA", "B7K2L9");
      expect(updates).toHaveBeenCalledTimes(1);
      expect(notifications).toHaveBeenCalledTimes(1);
      expect(notifications).toHaveBeenCalledWith({
        user_id: "caller",
        kind: "subject_published",
        subject_id: "subj-1",
      });
      if (block) expect(mocks.persistBlock).toHaveBeenCalledWith(mocks.admin, block, "r");
      else expect(mocks.persistBlock).not.toHaveBeenCalled();
    },
  );
  it("does nothing for the demo account", async () => {
    context.supabase.rpc.mockResolvedValue({ data: true, error: null });
    expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 0 });
    expect(mocks.admin.from).not.toHaveBeenCalled();
  });
  it("skips within the three-minute throttle", async () => {
    context.supabase.from.mockImplementation(() =>
      chain({ data: { last_recheck_at: new Date().toISOString() }, error: null }),
    );
    expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 0 });
    expect(mocks.check).not.toHaveBeenCalled();
  });
  it("does nothing while the shared block is active", async () => {
    mocks.readBlock.mockResolvedValue({ category: "credit_block", blockedAt: "now" });
    expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 0 });
    expect(mocks.check).not.toHaveBeenCalled();
  });
  it("publishes approved plates and notifies, rejects others and notifies", async () => {
    const notifications: unknown[] = [];
    mocks.admin.from.mockImplementation((table: string) => {
      const c = chain(
        table === "subjects"
          ? { data: [pendingRow], error: null }
          : (tables[table] ?? { data: null, error: null }),
      );
      if (table === "subjects")
        c["update"] = vi.fn(() => chain({ data: [{ id: "subj-1" }], error: null }));
      if (table === "profiles") c["update"] = vi.fn(() => chain({ data: null, error: null }));
      if (table === "notifications")
        c["insert"] = vi.fn((row: unknown) => {
          notifications.push(row);
          return chain({ data: null, error: null });
        });
      return c;
    });
    expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 1 });
    expect(notifications).toEqual([
      { user_id: "caller", kind: "subject_published", subject_id: "subj-1" },
    ]);
    mocks.check.mockResolvedValue({ outcome: "rejected", block: null });
    notifications.length = 0;
    expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 1 });
    expect(notifications).toEqual([
      { user_id: "caller", kind: "subject_rejected", subject_id: "subj-1" },
    ]);
  });
  it("a recheck block stops further checks in the same run", async () => {
    mocks.admin.from.mockImplementation((table: string) => {
      const c = chain(
        table === "subjects"
          ? { data: [pendingRow, { ...pendingRow, id: "subj-2" }], error: null }
          : (tables[table] ?? { data: null, error: null }),
      );
      if (table === "subjects" || table === "profiles")
        c["update"] = vi.fn(() => chain({ data: null, error: null }));
      return c;
    });
    mocks.check.mockResolvedValue({ outcome: "unavailable", block: "credit_block", runId: "r" });
    expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 0 });
    expect(mocks.check).toHaveBeenCalledTimes(1);
    expect(mocks.persistBlock).toHaveBeenCalledWith(mocks.admin, "credit_block", "r");
  });

  describe("pending stories", () => {
    const storyRow = {
      id: "story-1",
      subject_id: "subj-9",
      meaning: "Pacific Northwest love.",
      body: null,
      subjects: { identity_b: "PNW LV" },
    };
    function withStories(stories: unknown[], storyError: unknown = null) {
      tables["subjects"] = {
        data: [
          {
            id: "subj-9",
            identity_a: "US-WA",
            identity_b: "PNW LV",
            jurisdictions: { name: "Washington" },
          },
        ],
        error: null,
      };
      const notifications: unknown[] = [];
      const updates = vi.fn(() => chain({ data: [{ id: "row-1" }], error: null }));
      mocks.admin.from.mockImplementation((table: string) => {
        const c = chain(
          table === "stories"
            ? { data: stories, error: storyError }
            : (tables[table] ?? { data: null, error: null }),
        );
        if (table === "stories" || table === "profiles" || table === "subjects")
          c["update"] = updates;
        if (table === "notifications")
          c["insert"] = vi.fn((row: unknown) => {
            notifications.push(row);
            return chain({ data: null, error: null });
          });
        return c;
      });
      return { notifications, updates };
    }

    it("publishes an approved story, notifies, and asks for a fresh summary", async () => {
      const { notifications } = withStories([storyRow]);
      expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 2 });
      expect(mocks.checkStory).toHaveBeenCalledWith("Pacific Northwest love.", "", "PNW LV");
      expect(notifications).toEqual([
        { user_id: "caller", kind: "subject_published", subject_id: "subj-9" },
        {
          user_id: "caller",
          kind: "story_published",
          subject_id: "subj-9",
          story_id: "story-1",
        },
      ]);
      expect(mocks.refresh).toHaveBeenCalledWith("subj-9");
    });

    it("finishes the recheck while the summary run is still pending", async () => {
      withStories([storyRow]);
      mocks.refresh.mockReturnValue(new Promise(() => {}));
      expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 2 });
      expect(mocks.refresh).toHaveBeenCalledWith("subj-9");
    });

    it("rejects a failed story and notifies without a summary request", async () => {
      const { notifications } = withStories([storyRow]);
      mocks.checkStory.mockResolvedValue({ outcome: "rejected", block: null });
      expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 2 });
      expect(notifications).toEqual([
        { user_id: "caller", kind: "subject_published", subject_id: "subj-9" },
        {
          user_id: "caller",
          kind: "story_rejected",
          subject_id: "subj-9",
          story_id: "story-1",
        },
      ]);
      expect(mocks.refresh).not.toHaveBeenCalled();
    });

    it("stops on unavailable and on a block", async () => {
      withStories([storyRow, { ...storyRow, id: "story-2" }]);
      mocks.checkStory.mockResolvedValue({
        outcome: "unavailable",
        block: "credit_block",
        runId: "r",
      });
      expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 1 });
      expect(mocks.checkStory).toHaveBeenCalledTimes(1);
      expect(mocks.persistBlock).toHaveBeenCalledWith(mocks.admin, "credit_block", "r");
    });

    it("skips a failed pending-story read", async () => {
      withStories(null as unknown as unknown[], { message: "offline" });
      expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 1 });
      expect(mocks.checkStory).not.toHaveBeenCalled();
    });

    it("rechecks a pending story when there are no pending plates", async () => {
      withStories([storyRow]);
      tables["subjects"] = { data: [], error: null };
      expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 1 });
      expect(mocks.check).not.toHaveBeenCalled();
      expect(mocks.checkStory).toHaveBeenCalledWith("Pacific Northwest love.", "", "PNW LV");
      expect(mocks.refresh).toHaveBeenCalledWith("subj-9");
    });

    it("skips the story loop when the plate loop stops on unavailable", async () => {
      withStories([storyRow]);
      mocks.check.mockResolvedValue({ outcome: "unavailable", block: "credit_block", runId: "r" });
      expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 0 });
      expect(mocks.checkStory).not.toHaveBeenCalled();
      expect(mocks.admin.from).not.toHaveBeenCalledWith("stories");
    });

    it("notifies and refreshes only when the guarded update matched a row", async () => {
      const { notifications, updates } = withStories([storyRow]);
      updates.mockImplementation(() => chain({ data: [], error: null }));
      expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 2 });
      expect(notifications).toEqual([]);
      expect(mocks.refresh).not.toHaveBeenCalled();
    });
    it("rejected plates and stories notify nobody when the guarded update matched no row", async () => {
      const { notifications, updates } = withStories([storyRow]);
      updates.mockImplementation(() => chain({ data: [], error: null }));
      mocks.check.mockResolvedValue({ outcome: "rejected", block: null });
      mocks.checkStory.mockResolvedValue({ outcome: "rejected", block: null });
      expect(await call(recheckPendingSubjects, {})).toEqual({ rechecked: 2 });
      expect(notifications).toEqual([]);
      expect(mocks.refresh).not.toHaveBeenCalled();
    });

    it("checks a story with an empty plate text when its plate join is missing", async () => {
      withStories([{ ...storyRow, body: "Seen near Seattle.", subjects: null }]);
      tables["subjects"] = { data: [], error: null };
      await call(recheckPendingSubjects, {});
      expect(mocks.checkStory).toHaveBeenCalledWith(
        "Pacific Northwest love.",
        "Seen near Seattle.",
        "",
      );
    });
  });
});
