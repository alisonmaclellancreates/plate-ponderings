import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: { from: vi.fn(), rpc: vi.fn() },
  check: vi.fn(),
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
      const insertOrUpdate = vi.fn(() =>
        chain(table === "subjects" ? insertResult : { data: null, error: null }),
      );
      c["insert"] = insertOrUpdate;
      c["update"] = insertOrUpdate;
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
});

describe("searchPlate", () => {
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
      if (table === "subjects") c["update"] = vi.fn(() => chain({ data: null, error: null }));
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
});
