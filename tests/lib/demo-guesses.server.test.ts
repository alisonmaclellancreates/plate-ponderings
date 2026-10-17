import { beforeEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { fakeSupabase } from "./fake-supabase";
const db = fakeSupabase();
const m = vi.hoisted(() => ({ block: vi.fn(), guess: vi.fn() }));
vi.mock("@/lib/ai-block.server", () => ({ readAiBlock: m.block }));
vi.mock("@/lib/plate-guesses.server", () => ({ requestPlateGuess: m.guess }));
import { fillDemoGuesses } from "@/lib/demo-guesses.server";
const client = db.client as unknown as SupabaseClient<Database>;
const gaps = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, subject_guesses: null }));
beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  m.block.mockResolvedValue({ category: null });
  m.guess.mockResolvedValue("saved");
});
it("awaits up to five gaps sequentially and reports the remaining readback", async () => {
  db.queue("app_settings", { data: { demo_mode: true } });
  db.queue(
    "subjects",
    { data: [...gaps, { id: "has-guess", subject_guesses: {} }] },
    { data: gaps.slice(5) },
  );
  let active = false;
  m.guess.mockImplementation(async () => {
    expect(active).toBe(false);
    active = true;
    await Promise.resolve();
    active = false;
    return "saved";
  });
  expect(await fillDemoGuesses(client)).toEqual({
    outcome: "done",
    message: "2 plates still need a guess.",
  });
  expect(m.guess.mock.calls.map((a) => a[0])).toEqual(["p0", "p1", "p2", "p3", "p4"]);
});
it.each([null, { category: "credits" }])(
  "stops before the next attempt on pause %j",
  async (block) => {
    db.queue("app_settings", { data: { demo_mode: true } });
    db.queue("subjects", { data: gaps }, { data: gaps });
    m.block.mockResolvedValueOnce({ category: null }).mockResolvedValueOnce(block);
    await fillDemoGuesses(client);
    expect(m.guess).toHaveBeenCalledTimes(1);
  },
);
it.each([{ data: { demo_mode: false } }, { error: {} }])(
  "refuses off mode or settings failure before AI %j",
  async (result) => {
    db.queue("app_settings", result);
    expect((await fillDemoGuesses(client)).outcome).toBe("error");
    expect(m.guess).not.toHaveBeenCalled();
  },
);
it("contains query failures and leaves failed generations missing", async () => {
  db.queue("app_settings", { data: { demo_mode: true } });
  db.queue("subjects", { error: {} });
  expect((await fillDemoGuesses(client)).outcome).toBe("error");
  db.queue("app_settings", { data: { demo_mode: true } });
  db.queue("subjects", { data: gaps.slice(0, 1) }, { data: gaps.slice(0, 1) });
  m.guess.mockResolvedValue("failed");
  expect((await fillDemoGuesses(client)).message).toBe("1 plates still need a guess.");
});
it("treats a successful null subject read as no missing guesses", async () => {
  db.queue("app_settings", { data: { demo_mode: true } });
  db.queue("subjects", { data: null }, { data: null });
  expect(await fillDemoGuesses(client)).toEqual({
    outcome: "done",
    message: "0 plates still need a guess.",
  });
  expect(m.guess).not.toHaveBeenCalled();
});
