import { beforeEach, expect, it, vi } from "vitest";

type Result = { data?: unknown; error?: unknown; count?: number | null };
const m = vi.hoisted(() => ({
  results: {} as Record<string, Result[]>,
  calls: [] as { table: string; ops: [string, unknown[]][] }[],
  rpc: vi.fn(),
  remove: vi.fn(),
  bucket: vi.fn(),
}));

function from(table: string) {
  const call = { table, ops: [] as [string, unknown[]][] };
  m.calls.push(call);
  const builder: Record<string, unknown> = {};
  for (const op of ["select", "eq", "in", "is", "update", "delete"])
    builder[op] = (...args: unknown[]) => {
      call.ops.push([op, args]);
      return builder;
    };
  builder["then"] = (resolve: (r: Result) => unknown) =>
    resolve(m.results[table]?.shift() ?? { data: [], error: null });
  return builder;
}
const client = {
  from,
  rpc: m.rpc,
  storage: {
    from: (b: string) => {
      m.bucket(b);
      return { remove: m.remove };
    },
  },
};

vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: client }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (d: unknown) => d;
    const builder = {
      middleware: () => builder,
      inputValidator: (fn: typeof validate) => {
        validate = fn;
        return builder;
      },
      handler:
        (fn: (a: { data: unknown; context: unknown }) => unknown) => (args?: { data: unknown }) =>
          fn({ data: validate(args?.data), context: { userId: "me", supabase: client } }),
    };
    return builder;
  },
}));

import {
  buildSubmissions,
  dismissSubmission,
  getSubmissions,
  getUnreadDot,
  markSubmissionsRead,
  PLATE_REJECTED_LINE,
  STORY_REJECTED_LINE,
  SUBMISSION_PENDING,
} from "@/lib/submissions.functions";
import { DEMO_MESSAGE } from "@/lib/account-rules";

const j = { name: "Washington" };
const subject = (id: string, status: "published" | "pending" | "rejected", at: string) => ({
  id,
  identity_b: id.toLowerCase(),
  status,
  created_at: at,
  jurisdictions: j,
});
const story = (
  id: string,
  status: "published" | "pending" | "rejected",
  at: string,
  plateStatus = "published",
) => ({
  id,
  subject_id: `P-${id}`,
  status,
  created_at: at,
  subjects: { identity_b: `plate-${id}`, status: plateStatus, jurisdictions: j },
});

beforeEach(() => {
  vi.resetAllMocks();
  m.results = {};
  m.calls = [];
});

it("lists published, pending and rejected subjects and stories, newest first, with planned fields", async () => {
  m.results["subjects"] = [
    {
      data: [
        subject("PUB", "published", "2026-10-09T00:00:00Z"),
        subject("PEND", "pending", "2026-10-08T00:00:00Z"),
        subject("REJ", "rejected", "2026-10-07T00:00:00Z"),
      ],
      error: null,
    },
  ];
  m.results["stories"] = [
    {
      data: [
        story("S1", "published", "2026-10-06T00:00:00Z"),
        story("S2", "pending", "2026-10-05T00:00:00Z"),
        story("S3", "rejected", "2026-10-04T00:00:00Z"),
        story("S4", "pending", "2026-10-03T00:00:00Z", "pending"),
      ],
      error: null,
    },
    { data: [{ subject_id: "PUB" }, { subject_id: "PUB" }], error: null },
  ];
  m.results["notifications"] = [{ data: [{ subject_id: "P-S3", story_id: "S3" }], error: null }];
  m.results["hearts"] = [{ data: [{ story_id: "S1" }], error: null }];
  const { rows, unreadCount } = await getSubmissions();
  expect(unreadCount).toBe(1);
  expect(rows.map((r) => [r.id, r.moderation, r.action, r.explanation, r.updated])).toEqual([
    ["PUB", "published", "view", "This plate is live with 2 stories.", false],
    ["PEND", "pending", null, SUBMISSION_PENDING, false],
    ["REJ", "rejected", "dismiss", PLATE_REJECTED_LINE, false],
    ["S1", "published", "view", "Your story is live and has 1 heart.", false],
    ["S2", "pending", "view", SUBMISSION_PENDING, false],
    ["S3", "rejected", "dismiss", STORY_REJECTED_LINE, true],
    ["S4", "pending", null, SUBMISSION_PENDING, false],
  ]);
  expect(Object.keys(rows[0] ?? {}).sort()).toEqual(
    [
      "action",
      "date",
      "explanation",
      "id",
      "jurisdiction",
      "kind",
      "moderation",
      "plateState",
      "text",
      "updated",
    ].sort(),
  );
  expect(rows[0]).toMatchObject({ text: "PUB", jurisdiction: "Washington", plateState: "PUB" });
  expect(rows[4]).toMatchObject({ plateState: "P-S2", text: "PLATE-S2" });
  // Every read is filtered by the verified user and spans all three statuses, never hidden or deleted.
  const own = m.calls.slice(0, 2);
  expect(own[0]?.ops).toContainEqual(["eq", ["created_by", "me"]]);
  expect(own[1]?.ops).toContainEqual(["eq", ["author_id", "me"]]);
  for (const c of own)
    expect(c.ops).toContainEqual(["in", ["status", ["published", "pending", "rejected"]]]);
});

it("keeps subjects free of hearts and pluralises counts", () => {
  const { rows } = buildSubmissions(
    [
      subject("ONE", "published", "2026-10-02T00:00:00Z"),
      { ...subject("NOJ", "published", "2026-10-01T00:00:00Z"), jurisdictions: null },
    ],
    [
      story("S", "published", "2026-10-03T00:00:00Z"),
      { ...story("X", "published", "2026-10-00T00:00:00Z"), subjects: null },
    ],
    new Map([["ONE", 1]]),
    new Map([["S", 3]]),
    [
      { subject_id: "ONE", story_id: null },
      { subject_id: null, story_id: null },
    ],
  );
  expect(rows.map((r) => r.explanation)).toEqual([
    "Your story is live and has 3 hearts.",
    "This plate is live with 1 story.",
    "This plate is live with 0 stories.",
    "Your story is live and has 0 hearts.",
  ]);
  expect(
    rows.filter((r) => r.kind === "plate").every((r) => !r.explanation.includes("heart")),
  ).toBe(true);
  expect(rows[1]?.updated).toBe(true);
  expect(rows[2]?.jurisdiction).toBe("");
  expect(rows[3]).toMatchObject({ jurisdiction: "", text: "", action: null });
});

it.each(["subjects", "stories", "notifications"])("throws when the %s read fails", async (t) => {
  m.results[t] = [{ data: null, error: { message: "x" } }];
  await expect(getSubmissions()).rejects.toThrow("We couldn't load your submissions right now.");
});

it("throws when the count reads fail", async () => {
  m.results["hearts"] = [{ data: null, error: { message: "x" } }];
  await expect(getSubmissions()).rejects.toThrow();
});

it.each([
  [{ count: 2, error: null }, true],
  [{ count: 0, error: null }, false],
  [{ count: null, error: null }, false],
  [{ count: 3, error: { message: "x" } }, false],
])("reports the unread dot (%j)", async (result, unread) => {
  m.results["notifications"] = [result];
  expect(await getUnreadDot()).toEqual({ unread });
});

it.each([[{ data: true, error: null }], [{ data: null, error: { message: "x" } }]])(
  "never marks anything read for the demo account or an unknown role (%j)",
  async (role) => {
    m.rpc.mockResolvedValue(role);
    expect(await markSubmissionsRead()).toEqual({ marked: false });
    expect(m.calls).toHaveLength(0);
  },
);

it.each([
  [null, true],
  [{ message: "x" }, false],
])("marks the caller's unread notifications read (error %j)", async (error, marked) => {
  m.rpc.mockResolvedValue({ data: false, error: null });
  m.results["notifications"] = [{ data: null, error }];
  expect(await markSubmissionsRead()).toEqual({ marked });
  expect(m.calls[0]?.ops[0]?.[0]).toBe("update");
  expect(m.calls[0]?.ops).toContainEqual(["eq", ["user_id", "me"]]);
});

it.each([[{ data: true, error: null }], [{ data: null, error: { message: "x" } }]])(
  "refuses dismiss for the demo account before any delete (%j)",
  async (role) => {
    m.rpc.mockResolvedValue(role);
    expect(await dismissSubmission({ data: { kind: "story", id: "S" } })).toEqual({
      outcome: "demo",
      message: DEMO_MESSAGE,
    });
    expect(m.calls).toHaveLength(0);
  },
);

it("dismisses a rejected story with every condition in the delete, then removes its photo", async () => {
  m.rpc.mockResolvedValue({ data: false, error: null });
  m.results["stories"] = [{ data: [{ id: "S", photo_path: "me/s.jpg" }], error: null }];
  expect(await dismissSubmission({ data: { kind: "story", id: "S" } })).toEqual({
    outcome: "dismissed",
  });
  expect(m.calls[0]?.ops).toEqual([
    ["delete", []],
    ["eq", ["id", "S"]],
    ["eq", ["author_id", "me"]],
    ["eq", ["status", "rejected"]],
    ["select", ["id,photo_path"]],
  ]);
  expect(m.bucket).toHaveBeenCalledWith("story-photos");
  expect(m.remove).toHaveBeenCalledWith(["me/s.jpg"]);
});

it("dismisses a rejected story without a photo", async () => {
  m.rpc.mockResolvedValue({ data: false, error: null });
  m.results["stories"] = [{ data: [{ id: "S", photo_path: null }], error: null }];
  expect(await dismissSubmission({ data: { kind: "story", id: "S" } })).toEqual({
    outcome: "dismissed",
  });
  expect(m.remove).not.toHaveBeenCalled();
});

it.each([[{ data: [], error: null }], [{ data: null, error: { message: "x" } }]])(
  "leaves everything alone when no story matches (%j)",
  async (result) => {
    m.rpc.mockResolvedValue({ data: false, error: null });
    m.results["stories"] = [result];
    expect(await dismissSubmission({ data: { kind: "story", id: "S" } })).toEqual({
      outcome: "not_found",
    });
    expect(m.remove).not.toHaveBeenCalled();
  },
);

it.each([
  [{ data: [{ id: "P" }], error: null }, "dismissed"],
  [{ data: [], error: null }, "not_found"],
  [{ data: null, error: null }, "not_found"],
])(
  "dismisses a rejected plate only when the conditional delete matches",
  async (result, outcome) => {
    m.rpc.mockResolvedValue({ data: false, error: null });
    m.results["subjects"] = [result];
    expect(await dismissSubmission({ data: { kind: "plate", id: "P" } })).toEqual({ outcome });
    expect(m.calls[0]?.ops).toEqual([
      ["delete", []],
      ["eq", ["id", "P"]],
      ["eq", ["created_by", "me"]],
      ["eq", ["status", "rejected"]],
      ["select", ["id"]],
    ]);
    expect(m.remove).not.toHaveBeenCalled();
  },
);
