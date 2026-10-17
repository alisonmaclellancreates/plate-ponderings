import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  from: vi.fn(),
  block: vi.fn(),
  persist: vi.fn(),
  generate: vi.fn(),
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: m.from } }));
vi.mock("@/lib/ai-block.server", () => ({ readAiBlock: m.block, persistAiBlock: m.persist }));
vi.mock("@/lib/guess-generation.server", () => ({ generateGuess: m.generate }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (x: unknown) => x;
    const b = {
      inputValidator: (f: typeof validate) => {
        validate = f;
        return b;
      },
      handler: (f: (a: unknown) => unknown) => (a: { data: unknown }) =>
        f({ data: validate(a.data) }),
    };
    return b;
  },
}));
import { requestPlateGuess, fillPlateGuesses } from "@/lib/plate-guesses.server";
import { getPlateGuess } from "@/lib/plate-guesses.functions";
const ID = "55b9032d-9a7d-4c3f-b74c-fabaeb12edf4";
type R = { data?: unknown; error?: unknown; count?: number | null };
let queries: Record<string, ReturnType<typeof chain>[]>;
function chain(r: R) {
  const b: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const n of ["select", "eq", "order", "insert"]) b[n] = vi.fn(() => b);
  b["maybeSingle"] = vi.fn(async () => r);
  b["then"] = vi.fn((resolve: (x: R) => unknown) => resolve(r));
  return b;
}
function setup(guesses: R[], plates: R[], stories: R[] = []) {
  const queues: Record<string, R[]> = { subject_guesses: guesses, subjects: plates, stories };
  m.from.mockImplementation((table: string) => {
    const b = chain(queues[table]?.shift() ?? { data: null, error: null });
    (queries[table] ??= []).push(b);
    return b;
  });
}
const plate = {
  data: { id: ID, identity_a: "CA-ON", identity_b: "ROW43XYZ", jurisdictions: { name: "Ontario" } },
  error: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  queries = {};
  m.block.mockResolvedValue({ category: null });
  m.generate.mockResolvedValue({
    outcome: "generated",
    guess: { meaning: "Rowing", story: "One possibility." },
  });
});
it("inserts once and never overwrites", async () => {
  setup([{ data: null }, { error: null }], [plate]);
  expect(await requestPlateGuess(ID)).toBe("saved");
  expect(queries["subject_guesses"]?.[1]?.["insert"]).toHaveBeenCalledWith({
    subject_id: ID,
    meaning: "Rowing",
    story: "One possibility.",
  });
  setup([{ data: { subject_id: ID } }], []);
  expect(await requestPlateGuess(ID)).toBe("skipped");
  expect(m.generate).toHaveBeenCalledTimes(1);
});
it.each([null, { category: "credits" }])("pause fails closed %j", async (block) => {
  m.block.mockResolvedValue(block);
  expect(await requestPlateGuess(ID)).toBe("skipped");
  expect(m.from).not.toHaveBeenCalled();
});
it("handles query failures, missing plate and absent jurisdiction", async () => {
  setup([{ error: {} }], []);
  expect(await requestPlateGuess(ID)).toBe("failed");
  for (const p of [{ data: null }, { error: {} }]) {
    setup([{ data: null }], [p]);
    expect(await requestPlateGuess(ID)).toBe("skipped");
  }
  setup([{ data: null }, { error: {} }], [{ data: { ...plate.data, jurisdictions: null } }]);
  expect(await requestPlateGuess(ID)).toBe("failed");
  expect(m.generate).toHaveBeenCalledWith("CA-ON", "ROW43XYZ");
  setup([{ data: null }, { error: { code: "23505" } }], [plate]);
  expect(await requestPlateGuess(ID)).toBe("skipped");
});
it("failed or blocked AI saves nothing and persists terminal pause", async () => {
  for (const block of [null, "credits"]) {
    setup([{ data: null }], [plate]);
    m.generate.mockResolvedValue({ outcome: "failed", block, runId: "run" });
    expect(await requestPlateGuess(ID)).toBe("failed");
    expect(queries["subject_guesses"]?.at(-1)?.["insert"]).not.toHaveBeenCalled();
  }
  expect(m.persist).toHaveBeenCalledTimes(1);
});
it("caps gap fill at three failed attempts, excludes saved/new/other plates and keeps rest for later", async () => {
  const gaps = ["1", "2", "3", "4"].map((id) => ({ id, subject_guesses: null }));
  setup(
    Array.from({ length: 3 }, () => ({ data: null })),
    [
      {
        data: [
          ...gaps,
          { id: "saved", subject_guesses: { subject_id: "saved" } },
          { id: "new", subject_guesses: null },
        ],
      },
      plate,
      plate,
      plate,
    ],
  );
  m.generate.mockResolvedValue({ outcome: "failed", block: null });
  await fillPlateGuesses("caller", ["new"]);
  expect(m.generate).toHaveBeenCalledTimes(3);
  expect(queries["subjects"]?.[0]?.["eq"]).toHaveBeenCalledWith("created_by", "caller");
  expect(queries["subjects"]?.[0]?.["eq"]).toHaveBeenCalledWith("status", "published");
  expect(queries["subject_guesses"]?.flatMap((q) => q["eq"]?.mock.calls)).not.toContainEqual([
    "subject_id",
    "4",
  ]);
});
it("checks shared pause before each and handles empty/failed gap reads", async () => {
  for (const r of [{ error: {} }, { data: null }]) {
    setup([], [r]);
    await fillPlateGuesses("caller");
  }
  setup(
    [{ data: null }, { error: null }],
    [
      {
        data: [
          { id: "1", subject_guesses: null },
          { id: "2", subject_guesses: null },
        ],
      },
      plate,
    ],
  );
  m.block
    .mockResolvedValueOnce({ category: null })
    .mockResolvedValueOnce({ category: null })
    .mockResolvedValueOnce({ category: "credits" });
  await fillPlateGuesses("caller");
  expect(m.generate).toHaveBeenCalledTimes(1);
  setup([], [{ data: [{ id: "1", subject_guesses: null }] }]);
  m.block.mockResolvedValue(null);
  await fillPlateGuesses("caller");
  expect(m.generate).toHaveBeenCalledTimes(1);
});
async function read(id: unknown = ID) {
  return (getPlateGuess as unknown as (a: unknown) => Promise<unknown>)({ data: { plateId: id } });
}
it("before first published human story never selects or returns text; pending/rejected do not reveal", async () => {
  for (const count of [0, null]) {
    setup([{ data: { subject_id: ID } }], [plate], [{ count }]);
    expect(await read()).toEqual({ status: "hidden" });
    expect(queries["subject_guesses"]?.at(-1)?.["select"]).toHaveBeenCalledWith("subject_id");
    expect(queries["stories"]?.at(-1)?.["eq"]).toHaveBeenCalledWith("status", "published");
  }
});
it("reveals on one published story and hides again at zero, without viewer filters or mutations", async () => {
  setup(
    [{ data: { subject_id: ID } }, { data: { meaning: "Rowing", story: "One possibility." } }],
    [plate],
    [{ count: 1 }],
  );
  expect(await read()).toEqual({
    status: "revealed",
    meaning: "Rowing",
    story: "One possibility.",
  });
  expect(queries["stories"]?.[0]?.["eq"]?.mock.calls).toEqual([
    ["subject_id", ID],
    ["status", "published"],
  ]);
  setup([{ data: { subject_id: ID } }], [plate], [{ count: 0 }]);
  expect(await read()).toEqual({ status: "hidden" });
});
it("fails closed on malformed/missing/unpublished/read failures", async () => {
  expect(await read(42)).toEqual({ status: "absent" });
  expect(await read("bad")).toEqual({ status: "absent" });
  expect(m.from).not.toHaveBeenCalled();
  for (const p of [{ data: null }, { error: {} }]) {
    setup([], [p]);
    expect(await read()).toEqual({ status: "absent" });
  }
  for (const g of [{ data: null }, { error: {} }]) {
    setup([g], [plate]);
    expect(await read()).toEqual({ status: "absent" });
    setup([{ data: { subject_id: ID } }, g], [plate], [{ count: 1 }]);
    expect(await read()).toEqual({ status: "absent" });
  }
  setup([{ data: { subject_id: ID } }], [plate], [{ count: 1, error: {} }]);
  expect(await read()).toEqual({ status: "hidden" });
});
