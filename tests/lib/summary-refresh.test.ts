import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  admin: { from: vi.fn(), rpc: vi.fn() },
  readBlock: vi.fn(),
  persistBlock: vi.fn(),
  generate: vi.fn(),
  calls: [] as string[],
}));

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: m.admin }));
vi.mock("@/lib/ai-block.server", () => ({
  readAiBlock: m.readBlock,
  persistAiBlock: m.persistBlock,
}));
vi.mock("@/lib/summary-generation.server", async (orig) => ({
  ...(await orig<typeof import("@/lib/summary-generation.server")>()),
  generateSummary: m.generate,
}));

import { requestSummaryRefresh } from "@/lib/summary-refresh.server";

type Result = { data?: unknown; error: unknown; count?: number | null };

function chain(result: Result, onInsert?: (row: unknown) => Result) {
  const b: Record<string, unknown> = {};
  for (const n of ["select", "eq", "order", "limit"]) b[n] = vi.fn(() => b);
  b["maybeSingle"] = vi.fn(async () => result);
  b["insert"] = vi.fn(async (row: unknown) => onInsert?.(row) ?? { error: null });
  b["then"] = (resolve: (r: Result) => void) => resolve(result);
  return b;
}

let countResult: Result;
let rowsResult: Result;
let latestResult: Result;
let insertResult: Result;
let inserted: Record<string, unknown> | null;

beforeEach(() => {
  vi.clearAllMocks();
  m.calls = [];
  countResult = { count: 2, error: null };
  rowsResult = {
    data: [
      { meaning: "Pacific Northwest love", source: "owner", body: "More." },
      { meaning: "Las Vegas", source: "guess", body: null },
    ],
    error: null,
  };
  latestResult = { data: { version: 3 }, error: null };
  insertResult = { error: null };
  inserted = null;
  let storiesCalls = 0;
  m.admin.from.mockImplementation((table: string) => {
    if (table === "stories") {
      storiesCalls++;
      m.calls.push(storiesCalls === 1 ? "count" : "read");
      return chain(storiesCalls === 1 ? countResult : rowsResult);
    }
    return chain(latestResult, (row) => {
      inserted = row as Record<string, unknown>;
      return insertResult;
    });
  });
  m.admin.rpc.mockImplementation(async () => {
    m.calls.push("claim");
    return { data: true, error: null };
  });
  m.readBlock.mockImplementation(async () => {
    m.calls.push("pause");
    return { category: null, blockedAt: null };
  });
  m.generate.mockResolvedValue({
    outcome: "generated",
    summary: { text: "Most agree.", disagreementScore: 20 },
  });
});

describe("requestSummaryRefresh", () => {
  it("checks the pause and published stories before claiming, then saves the next version", async () => {
    const before = Date.now();
    expect(await requestSummaryRefresh("plate-1")).toBe("saved");
    expect(m.calls).toEqual(["pause", "count", "claim", "read"]);
    expect(m.admin.rpc).toHaveBeenCalledWith("claim_summary_run", { _subject_id: "plate-1" });
    expect(m.generate).toHaveBeenCalledWith([
      { meaning: "Pacific Northwest love", sourceLabel: "It's my plate", text: "More." },
      { meaning: "Las Vegas", sourceLabel: "My best guess", text: null },
    ]);
    expect(inserted).toMatchObject({
      subject_id: "plate-1",
      version: 4,
      text: "Most agree.",
      disagreement_score: 20,
      story_count: 2,
    });
    const started = Date.parse(String(inserted?.["started_at"]));
    const generated = Date.parse(String(inserted?.["generated_at"]));
    expect(started).toBeGreaterThanOrEqual(before);
    expect(generated).toBeGreaterThanOrEqual(started);
  });

  it("passes an unknown source key through as its own label", async () => {
    rowsResult = { data: [{ meaning: "Odd", source: "legacy", body: null }], error: null };
    await requestSummaryRefresh("plate-1");
    expect(m.generate).toHaveBeenCalledWith([
      { meaning: "Odd", sourceLabel: "legacy", text: null },
    ]);
  });

  it("numbers the first version 1", async () => {
    latestResult = { data: null, error: null };
    await requestSummaryRefresh("plate-1");
    expect(inserted?.["version"]).toBe(1);
  });

  it("does nothing while AI checks are paused, without using the minute", async () => {
    m.readBlock.mockResolvedValue({ category: "credits", blockedAt: "x" });
    expect(await requestSummaryRefresh("plate-1")).toBe("skipped");
    expect(m.admin.rpc).not.toHaveBeenCalled();
    expect(m.generate).not.toHaveBeenCalled();
  });

  it("skips when the pause cannot be read", async () => {
    m.readBlock.mockResolvedValue(null);
    expect(await requestSummaryRefresh("plate-1")).toBe("skipped");
    expect(m.admin.rpc).not.toHaveBeenCalled();
  });

  it("never runs for a plate with no published stories, and does not claim", async () => {
    countResult = { count: 0, error: null };
    expect(await requestSummaryRefresh("plate-1")).toBe("skipped");
    expect(m.admin.rpc).not.toHaveBeenCalled();
    expect(m.generate).not.toHaveBeenCalled();
  });

  it("skips when the count fails", async () => {
    countResult = { count: null, error: { message: "x" } };
    expect(await requestSummaryRefresh("plate-1")).toBe("skipped");
    expect(m.admin.rpc).not.toHaveBeenCalled();
  });

  it("skips when a run already began within the minute", async () => {
    m.admin.rpc.mockResolvedValue({ data: false, error: null });
    expect(await requestSummaryRefresh("plate-1")).toBe("skipped");
    expect(m.generate).not.toHaveBeenCalled();
  });

  it("skips when the claim errors", async () => {
    m.admin.rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    expect(await requestSummaryRefresh("plate-1")).toBe("skipped");
    expect(m.generate).not.toHaveBeenCalled();
  });

  it("fails without generating when the stories cannot be read", async () => {
    rowsResult = { data: null, error: { message: "x" } };
    expect(await requestSummaryRefresh("plate-1")).toBe("failed");
    expect(m.generate).not.toHaveBeenCalled();
  });

  it("fails without generating when the stories vanished after the claim", async () => {
    rowsResult = { data: [], error: null };
    expect(await requestSummaryRefresh("plate-1")).toBe("failed");
    expect(m.generate).not.toHaveBeenCalled();
  });

  it("saves nothing when generation fails, and persists a terminal block", async () => {
    m.generate.mockResolvedValue({ outcome: "failed", block: "credits", runId: "run-2" });
    expect(await requestSummaryRefresh("plate-1")).toBe("failed");
    expect(m.persistBlock).toHaveBeenCalledWith(m.admin, "credits", "run-2");
    expect(inserted).toBeNull();
  });

  it("saves nothing and persists nothing on a transient failure", async () => {
    m.generate.mockResolvedValue({ outcome: "failed", block: null });
    expect(await requestSummaryRefresh("plate-1")).toBe("failed");
    expect(m.persistBlock).not.toHaveBeenCalled();
    expect(inserted).toBeNull();
  });

  it("fails when the latest version cannot be read", async () => {
    latestResult = { data: null, error: { message: "x" } };
    expect(await requestSummaryRefresh("plate-1")).toBe("failed");
    expect(inserted).toBeNull();
  });

  it("fails when the insert fails, for example a concurrent version", async () => {
    insertResult = { error: { message: "duplicate key" } };
    expect(await requestSummaryRefresh("plate-1")).toBe("failed");
  });
});

it("a saved AI guess cannot enter summary input or its human story count", async () => {
  const prior = m.admin.from.getMockImplementation();
  m.admin.from.mockImplementation((table: string) => {
    if (table === "subject_guesses")
      return chain({ data: { meaning: "AI-only sentinel", story: "not human" }, error: null });
    return prior?.(table);
  });
  expect(await requestSummaryRefresh("plate-1")).toBe("saved");
  expect(m.admin.from).not.toHaveBeenCalledWith("subject_guesses");
  expect(JSON.stringify(m.generate.mock.calls)).not.toContain("AI-only sentinel");
  expect(inserted?.["story_count"]).toBe(2);
});
