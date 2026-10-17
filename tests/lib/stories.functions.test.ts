import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: { from: vi.fn(), rpc: vi.fn(), auth: { getUser: vi.fn() } },
  check: vi.fn(),
  readBlock: vi.fn(),
  persistBlock: vi.fn(),
  refresh: vi.fn(),
  getRequest: vi.fn(),
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
vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocks.getRequest }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: mocks.admin }));
vi.mock("@/lib/story-moderation.server", () => ({ checkStory: mocks.check }));
vi.mock("@/lib/ai-block.server", () => ({
  readAiBlock: mocks.readBlock,
  persistAiBlock: mocks.persistBlock,
}));
vi.mock("@/lib/summary-refresh.server", () => ({ requestSummaryRefresh: mocks.refresh }));

import {
  addStory,
  getPlateStories,
  validateStory,
  HOW_KEYS,
} from "@/lib/stories.functions";
import { RATE_LIMIT_MESSAGE } from "@/lib/account-rules";

type Result = { data: unknown; error: unknown };

/** A chainable query mock; terminal methods resolve `result`. */
function chain(result: Result) {
  const b: Record<string, unknown> = {};
  for (const name of ["select", "eq", "in", "order", "insert", "update"])
    b[name] = vi.fn(() => b);
  b["maybeSingle"] = vi.fn(async () => result);
  b["single"] = vi.fn(async () => result);
  b["then"] = (resolve: (r: Result) => void) => resolve(result);
  return b;
}

const PLATE = { data: { id: "plate-1", identity_b: "B7K2L9" }, error: null };
const context = { userId: "caller", supabase: { rpc: vi.fn(), from: vi.fn() } };

async function call(fn: unknown, data: unknown) {
  return await (fn as (a: unknown) => Promise<Record<string, unknown>>)({ data, context });
}

const INPUT = { plateId: "plate-1", meaning: "Pacific Northwest love.", source: "guess", more: "" };

let tables: Record<string, Result>;
let storyInsert: Result;

beforeEach(() => {
  vi.clearAllMocks();
  tables = {
    subjects: PLATE,
    stories: { data: [], error: null },
    blocks: { data: [], error: null },
    profiles: { data: [], error: null },
  };
  storyInsert = { data: { id: "story-1" }, error: null };
  mocks.admin.from.mockImplementation((table: string) => {
    const c = chain(tables[table] ?? { data: null, error: null });
    if (table === "stories") c["insert"] = vi.fn(() => chain(storyInsert));
    return c;
  });
  mocks.admin.rpc.mockResolvedValue({ data: true, error: null });
  mocks.admin.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  context.supabase.rpc.mockResolvedValue({ data: false, error: null });
  mocks.readBlock.mockResolvedValue({ category: null, blockedAt: null });
  mocks.persistBlock.mockResolvedValue(undefined);
  mocks.check.mockResolvedValue({ outcome: "approved", block: null, runId: "run-1" });
  mocks.refresh.mockResolvedValue(undefined);
  mocks.getRequest.mockReturnValue(undefined);
});

describe("validateStory", () => {
  it("accepts each of the four source keys the database accepts", () => {
    for (const source of HOW_KEYS) {
      expect(validateStory({ ...INPUT, source })).toBe(true);
    }
    expect(HOW_KEYS).toEqual(["owner", "knows_owner", "secondhand", "guess"]);
  });
  it("refuses bad meanings, sources and long text", () => {
    expect(validateStory({ ...INPUT, meaning: "hi" })).toBe(false);
    expect(validateStory({ ...INPUT, meaning: "x".repeat(81) })).toBe(false);
    expect(validateStory({ ...INPUT, source: "knows" })).toBe(false);
    expect(validateStory({ ...INPUT, more: "x".repeat(501) })).toBe(false);
  });
});

describe("addStory", () => {
  it("refuses the demo account with the brief message", async () => {
    context.supabase.rpc.mockResolvedValue({ data: true, error: null });
    const result = await call(addStory, INPUT);
    expect(result.outcome).toBe("demo");
    expect(String(result.message)).toContain("demo");
    expect(mocks.admin.from).not.toHaveBeenCalled();
  });
  it("refuses invalid input before touching the database", async () => {
    expect(await call(addStory, { ...INPUT, meaning: "hi" })).toEqual({
      outcome: "validation",
    });
    expect(mocks.admin.from).not.toHaveBeenCalled();
  });
  it("errors when the plate is missing or not published", async () => {
    tables["subjects"] = { data: null, error: null };
    expect(await call(addStory, INPUT)).toEqual({ outcome: "error" });
  });
  it("rate limits after five submissions per 15 minutes", async () => {
    mocks.admin.rpc.mockResolvedValue({ data: false, error: null });
    expect(await call(addStory, INPUT)).toEqual({
      outcome: "rate-limited",
      message: RATE_LIMIT_MESSAGE,
    });
  });
  it("saves pending without an AI call while the shared block is active", async () => {
    mocks.readBlock.mockResolvedValue({ category: "credit_block", blockedAt: "now" });
    expect(await call(addStory, INPUT)).toEqual({ outcome: "pending" });
    expect(mocks.check).not.toHaveBeenCalled();
  });
  it("saves pending when the check is unavailable", async () => {
    mocks.check.mockResolvedValue({ outcome: "unavailable", block: null });
    expect(await call(addStory, INPUT)).toEqual({ outcome: "pending" });
  });
  it("persists a terminal block and saves pending", async () => {
    mocks.check.mockResolvedValue({ outcome: "unavailable", block: "credit_block", runId: "r" });
    expect(await call(addStory, INPUT)).toEqual({ outcome: "pending" });
    expect(mocks.persistBlock).toHaveBeenCalledWith(mocks.admin, "credit_block", "r");
  });
  it("saves nothing and reports rejection when the check fails", async () => {
    mocks.check.mockResolvedValue({ outcome: "rejected", block: null });
    expect(await call(addStory, INPUT)).toEqual({ outcome: "rejected" });
    expect(storyInsert.data).toEqual({ id: "story-1" });
  });
  it("publishes and asks for a fresh summary when the check passes", async () => {
    expect(await call(addStory, INPUT)).toEqual({ outcome: "published" });
    expect(mocks.refresh).toHaveBeenCalledWith("plate-1");
  });
  it("does not ask for a summary when the story stays pending", async () => {
    mocks.check.mockResolvedValue({ outcome: "unavailable", block: null });
    await call(addStory, INPUT);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

describe("getPlateStories", () => {
  const row = (
    id: string,
    source: string,
    author: string,
    publishedAt: string,
    meaning = `Meaning ${id}`,
  ) => ({ id, meaning, source, body: null, author_id: author, published_at: publishedAt });

  it("returns null for a missing or unpublished plate", async () => {
    tables["subjects"] = { data: null, error: null };
    expect(await call(getPlateStories, { plateId: "nope" })).toBeNull();
  });

  it("orders the owner story first, then oldest first, never by hearts", async () => {
    tables["stories"] = {
      data: [
        row("s2", "guess", "a2", "2026-10-02"),
        row("s1", "owner", "a1", "2026-10-05"),
        row("s3", "secondhand", "a3", "2026-10-01"),
      ],
      error: null,
    };
    tables["profiles"] = {
      data: [
        { id: "a1", handle: "OwnerOne" },
        { id: "a2", handle: "Guesser" },
        { id: "a3", handle: "Asked" },
      ],
      error: null,
    };
    mocks.admin.rpc.mockResolvedValue({
      data: [{ story_id: "s3", hearts: 99 }],
      error: null,
    });
    const result = (await call(getPlateStories, { plateId: "plate-1" })) as unknown as {
      stories: { id: string; handle: string; hearts: number }[];
      storyCount: number;
      ownerHandle: string;
      hasOwnerStory: boolean;
      pending: unknown[];
    };
    expect(result.stories.map((s) => s.id)).toEqual(["s1", "s3", "s2"]);
    expect(result.storyCount).toBe(3);
    expect(result.ownerHandle).toBe("OwnerOne");
    expect(result.hasOwnerStory).toBe(true);
    expect(result.pending).toEqual([]);
    expect(result.stories[2]?.hearts).toBe(0);
  });

  it("shows a second owner claim as a normal story alongside the first", async () => {
    tables["stories"] = {
      data: [row("s1", "owner", "a1", "2026-10-01"), row("s2", "owner", "a2", "2026-10-02")],
      error: null,
    };
    const result = (await call(getPlateStories, { plateId: "plate-1" })) as unknown as {
      stories: { id: string; source: string }[];
    };
    expect(result.stories.map((s) => s.source)).toEqual(["owner", "owner"]);
  });

  it("signed out: no pending stories, no block filter", async () => {
    tables["stories"] = { data: [row("s1", "guess", "a1", "2026-10-01")], error: null };
    const result = (await call(getPlateStories, { plateId: "plate-1" })) as unknown as {
      pending: unknown[];
      stories: unknown[];
    };
    expect(result.pending).toEqual([]);
    expect(result.stories).toHaveLength(1);
    expect(mocks.admin.auth.getUser).not.toHaveBeenCalled();
  });

  it("signed in: own pending stories appear, blocked authors are hidden", async () => {
    mocks.getRequest.mockReturnValue({
      headers: { get: () => "Bearer a.b.c" },
    });
    mocks.admin.auth.getUser.mockResolvedValue({
      data: { user: { id: "viewer" } },
      error: null,
    });
    tables["blocks"] = { data: [{ blocked_id: "a2" }], error: null };
    const published = [row("s1", "guess", "a1", "2026-10-01"), row("s2", "guess", "a2", "2026-10-02")];
    const pendingRows = [row("p1", "guess", "viewer", "")];
    mocks.admin.from.mockImplementation((table: string) => {
      if (table === "stories") {
        const c = chain({ data: published, error: null });
        // The pending query chains .eq("status","pending").eq("author_id", viewer).
        let pending = false;
        const eq = vi.fn((_col: string, value: string) => {
          if (value === "pending") pending = true;
          return c;
        });
        c["eq"] = eq;
        c["then"] = (resolve: (r: Result) => void) =>
          resolve({ data: pending ? pendingRows : published, error: null });
        return c;
      }
      return chain(tables[table] ?? { data: null, error: null });
    });
    const result = (await call(getPlateStories, { plateId: "plate-1" })) as unknown as {
      stories: { id: string }[];
      pending: { id: string }[];
    };
    expect(result.stories.map((s) => s.id)).toEqual(["s1"]);
    expect(result.pending.map((s) => s.id)).toEqual(["p1"]);
  });

  it("one person cannot get another's pending stories", async () => {
    mocks.getRequest.mockReturnValue({ headers: { get: () => "Bearer a.b.c" } });
    mocks.admin.auth.getUser.mockResolvedValue({
      data: { user: { id: "viewer" } },
      error: null,
    });
    const eqArgs: [string, string][] = [];
    mocks.admin.from.mockImplementation((table: string) => {
      const c = chain(tables[table] ?? { data: [], error: null });
      if (table === "stories") {
        c["eq"] = vi.fn((col: string, value: string) => {
          eqArgs.push([col, value]);
          return c;
        });
      }
      return c;
    });
    await call(getPlateStories, { plateId: "plate-1" });
    const authorFilter = eqArgs.find(([col]) => col === "author_id");
    expect(authorFilter).toEqual(["author_id", "viewer"]);
  });
});
