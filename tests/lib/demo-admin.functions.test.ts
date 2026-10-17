import { beforeEach, expect, it, vi } from "vitest";
import { serverFnMock } from "./fake-supabase";
const m = vi.hoisted(() => ({ rpc: vi.fn(), reset: vi.fn(), fill: vi.fn() }));
vi.mock("@tanstack/react-start", () =>
  serverFnMock(() => ({ userId: "caller", supabase: { rpc: m.rpc } })),
);
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));
vi.mock("@/lib/demo-reset.server", () => ({ resetDemoSeed: m.reset }));
vi.mock("@/lib/demo-guesses.server", () => ({ fillDemoGuesses: m.fill }));
import { resetSeedData, fillMissingGuesses } from "@/lib/demo-admin.functions";
beforeEach(() => {
  vi.clearAllMocks();
  m.rpc.mockImplementation(async (_: string, args: { _role: string }) => ({
    data: args._role === "admin",
    error: null,
  }));
  m.reset.mockResolvedValue({ outcome: "done" });
  m.fill.mockResolvedValue({ outcome: "done" });
});
it("requires typed confirmation before calling privileged reset", async () => {
  expect((await resetSeedData({ data: { confirmation: "reset" } })).outcome).toBe("error");
  expect(m.reset).not.toHaveBeenCalled();
  await resetSeedData({ data: { confirmation: "RESET" } });
  expect(m.reset).toHaveBeenCalledOnce();
  await fillMissingGuesses();
  expect(m.fill).toHaveBeenCalledOnce();
});
it.each(["non-admin", "admin-error", "demo", "demo-error"])(
  "refuses %s for both privileged functions",
  async (failure) => {
    m.rpc.mockImplementation(async (_: string, args: { _role: string }) => ({
      data: args._role === "admin" ? failure !== "non-admin" : failure === "demo",
      error: failure === `${args._role}-error` ? {} : null,
    }));
    expect((await resetSeedData({ data: { confirmation: "RESET" } })).outcome).toBe("error");
    expect((await fillMissingGuesses()).outcome).toBe("error");
    expect(m.reset).not.toHaveBeenCalled();
    expect(m.fill).not.toHaveBeenCalled();
  },
);
