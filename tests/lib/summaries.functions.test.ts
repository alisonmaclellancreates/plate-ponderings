import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  admin: { from: vi.fn(), rpc: vi.fn() },
  refresh: vi.fn(),
  run: vi.fn(),
  hidden: new Set<string>(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (data: unknown) => data;
    const builder = {
      inputValidator: (fn: (data: unknown) => unknown) => {
        validate = fn;
        return builder;
      },
      handler: (fn: (args: { data: unknown }) => unknown) => (args: { data: unknown }) =>
        fn({ data: validate(args.data) }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: m.admin }));
vi.mock("@/lib/summary-refresh.server", () => ({ requestSummaryRefresh: m.refresh }));
vi.mock("@/lib/after-response.server", () => ({ runAfterResponse: m.run }));

import { getPlateSummary } from "@/lib/summaries.functions";

type Result = { data: unknown; error: unknown };
function chain(result: Result) {
  const b: Record<string, unknown> = {};
  for (const n of ["select", "eq", "order"]) b[n] = vi.fn(() => b);
  b["maybeSingle"] = vi.fn(async () => result);
  b["then"] = (resolve: (r: Result) => void) => resolve(result);
  return b;
}

const version = (n: number, score: number, count: number, day: string) => ({
  id: `v${n}`,
  version: n,
  text: `Version ${n}`,
  disagreement_score: score,
  story_count: count,
  started_at: `2026-10-${day}T00:00:00Z`,
  generated_at: `2026-10-${day}T00:01:00Z`,
});

let tables: Record<string, Result>;

beforeEach(() => {
  vi.clearAllMocks();
  m.hidden.clear();
  tables = {
    subjects: { data: { id: "plate-1" }, error: null },
    summaries: {
      data: [version(3, 80, 2, "12"), version(2, 50, 2, "10"), version(1, 10, 1, "05")],
      error: null,
    },
    stories: {
      data: [{ published_at: "2026-10-09T00:00:00Z" }, { published_at: "2026-10-04T00:00:00Z" }],
      error: null,
    },
  };
  m.admin.from.mockImplementation((t: string) => chain(tables[t] ?? { data: null, error: null }));
  m.admin.rpc.mockImplementation(async () => ({
    data:
      (tables["summaries"]?.data as ReturnType<typeof version>[] | null)?.filter(
        (v) => !m.hidden.has(v.id),
      ) ?? null,
    error: tables["summaries"]?.error,
  }));
  m.refresh.mockReturnValue(new Promise(() => {}));
});

const call = (plateId: unknown) =>
  (getPlateSummary as unknown as (a: unknown) => Promise<Record<string, unknown> | null>)({
    data: { plateId },
  });

describe("getPlateSummary", () => {
  it("keeps foreground reads fixed at two table reads and one visibility RPC for 100 versions", async () => {
    tables["summaries"] = {
      data: Array.from({ length: 100 }, (_, i) => version(100 - i, 10, 2, "12")),
      error: null,
    };
    const result = await call("plate-1");
    expect(result?.["earlier"]).toHaveLength(99);
    expect(m.admin.from).toHaveBeenCalledTimes(2);
    expect(m.admin.rpc).toHaveBeenCalledExactlyOnceWith("get_visible_summary_versions", {
      _subject_id: "plate-1",
    });
  });
  it("returns the newest visible version and earlier visible versions, newest first", async () => {
    const result = await call("plate-1");
    expect(result).toEqual({
      current: {
        version: 3,
        text: "Version 3",
        consensus: "differ",
        storyCount: 2,
        generatedAt: "2026-10-12T00:01:00Z",
      },
      earlier: [
        expect.objectContaining({ version: 2, consensus: "mixed" }),
        expect.objectContaining({ version: 1, consensus: "agree", storyCount: 1 }),
      ],
      catchingUp: false,
    });
    expect(m.admin.rpc).toHaveBeenCalledExactlyOnceWith("get_visible_summary_versions", {
      _subject_id: "plate-1",
    });
    expect(m.admin.from).not.toHaveBeenCalledWith("summaries");
    expect(m.run).not.toHaveBeenCalled();
  });

  it("never returns a version influenced by a hidden story, and returns it once unhidden", async () => {
    m.hidden.add("v3");
    m.hidden.add("v2");
    const hidden = await call("plate-1");
    expect(hidden?.["current"]).toEqual(expect.objectContaining({ version: 1 }));
    expect(hidden?.["earlier"]).toEqual([]);
    expect(JSON.stringify(hidden)).not.toContain("Version 3");
    expect(JSON.stringify(hidden)).not.toContain("Version 2");
    expect(hidden?.["catchingUp"]).toBe(true);

    m.hidden.clear();
    const restored = await call("plate-1");
    expect(restored?.["current"]).toEqual(expect.objectContaining({ version: 3 }));
    expect((restored?.["earlier"] as unknown[]).length).toBe(2);
    expect(restored?.["catchingUp"]).toBe(false);
  });

  it("returns no data when the batch visibility read fails", async () => {
    m.admin.rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    const result = await call("plate-1");
    expect(result).toBeNull();
  });

  it("returns at once and starts a run without waiting when catching up", async () => {
    tables["stories"] = {
      data: [{ published_at: "2026-10-13T00:00:00Z" }, ...(tables["stories"]?.data as unknown[])],
      error: null,
    };
    const result = await call("plate-1");
    expect(result?.["catchingUp"]).toBe(true);
    expect(m.refresh).toHaveBeenCalledWith("plate-1");
    expect(m.run).toHaveBeenCalledWith(m.refresh.mock.results[0]?.value);
  });

  it("catches up with published stories and no version at all (zero history)", async () => {
    tables["summaries"] = { data: [], error: null };
    const result = await call("plate-1");
    expect(result).toEqual({ current: null, earlier: [], catchingUp: true });
  });

  it("returns nothing to show for a plate with no stories and no versions", async () => {
    tables["summaries"] = { data: [], error: null };
    tables["stories"] = { data: [], error: null };
    expect(await call("plate-1")).toEqual({ current: null, earlier: [], catchingUp: false });
    expect(m.run).not.toHaveBeenCalled();
  });

  it("handles null rows from the database as empty", async () => {
    tables["summaries"] = { data: null, error: null };
    tables["stories"] = { data: null, error: null };
    expect(await call("plate-1")).toEqual({ current: null, earlier: [], catchingUp: false });
  });

  it("returns null for a missing, unpublished or non-string plate id", async () => {
    tables["subjects"] = { data: null, error: null };
    expect(await call("plate-1")).toBeNull();
    expect(await call(42)).toBeNull();
    tables["subjects"] = { data: null, error: { message: "x" } };
    expect(await call("plate-1")).toBeNull();
  });

  it("returns null when versions or stories cannot be read", async () => {
    tables["summaries"] = { data: null, error: { message: "x" } };
    expect(await call("plate-1")).toBeNull();
    tables["summaries"] = { data: [], error: null };
    tables["stories"] = { data: null, error: { message: "x" } };
    expect(await call("plate-1")).toBeNull();
  });
});
