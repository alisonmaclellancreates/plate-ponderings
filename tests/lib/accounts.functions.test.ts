import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: { from: vi.fn(), rpc: vi.fn() }, moderate: vi.fn() }));
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
vi.mock("@/lib/handle-moderation.server", () => ({ moderateHandle: mocks.moderate }));
import {
  getAccount,
  getDemoSetting,
  checkHandle,
  saveHandle,
  getHandleCheckStatus,
  resumeHandleChecks,
} from "@/lib/accounts.functions";
import {
  HANDLE_UNAVAILABLE,
  HANDLE_REJECTED,
  HANDLE_TAKEN,
  RATE_LIMIT_MESSAGE,
  DEMO_MESSAGE,
} from "@/lib/account-rules";
type Result = { data: unknown; error: unknown };
function chain(result: Result) {
  const b: Record<string, unknown> = {};
  for (const name of ["select", "eq", "single", "ilike", "neq", "update"]) b[name] = vi.fn(() => b);
  b["then"] = (resolve: (r: Result) => void) => resolve(result);
  return b;
}
let roleResult: Result;
let roles: Result;
let profile: Result;
let settings: Result;
let taken: Result;
let updated: Result;
let persist: Result;
let attempt: Result;
const context = { userId: "caller", supabase: { rpc: vi.fn(), from: vi.fn() } };
async function call(fn: unknown, handle: unknown = "Alison_42") {
  return await (fn as (a: unknown) => Promise<Record<string, unknown>>)({
    data: { handle },
    context,
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  roleResult = { data: false, error: null };
  roles = { data: [{ role: "admin" }], error: null };
  profile = { data: { handle: "Traveler1234" }, error: null };
  settings = {
    data: { demo_mode: false, handle_check_block_category: null, handle_check_blocked_at: null },
    error: null,
  };
  taken = { data: [], error: null };
  updated = { data: { handle: "Alison_42" }, error: null };
  persist = { data: null, error: null };
  attempt = { data: true, error: null };
  context.supabase.rpc.mockImplementation(async () => roleResult);
  context.supabase.from.mockImplementation((table: string) =>
    chain(table === "profiles" ? profile : roles),
  );
  mocks.admin.rpc.mockImplementation(async () => attempt);
  mocks.admin.from.mockImplementation((table: string) => {
    const c = chain(table === "profiles" ? taken : settings);
    c["update"] = vi.fn(() => chain(table === "profiles" ? updated : persist));
    return c;
  });
  mocks.moderate.mockResolvedValue({ outcome: "approved", block: null });
});
describe("account reads", () => {
  it("projects own handle and verified roles, never ids", async () => {
    expect(await call(getAccount)).toEqual({
      handle: "Traveler1234",
      isDemo: false,
      isAdmin: true,
    });
    roles.data = [{ role: "demo" }];
    expect(await call(getAccount)).toEqual({
      handle: "Traveler1234",
      isDemo: true,
      isAdmin: false,
    });
  });
  it("fails closed on profile or role errors", async () => {
    profile.error = {};
    await expect(call(getAccount)).rejects.toThrow();
    profile.error = null;
    roles.error = {};
    await expect(call(getAccount)).rejects.toThrow();
  });
  it("projects only the demo flag with a false fallback", async () => {
    expect(await call(getDemoSetting)).toEqual({ demoEnabled: false });
    settings.data = { demo_mode: true };
    expect(await call(getDemoSetting)).toEqual({ demoEnabled: true });
    settings.data = null;
    expect(await call(getDemoSetting)).toEqual({ demoEnabled: false });
  });
});
describe("availability", () => {
  it.each([42, null, {}, ["Alison_42"]])(
    "refuses non-string handle input %j before privileged reads",
    async (handle) => {
      expect(await call(checkHandle, handle)).toEqual({ available: false });
      expect(mocks.admin.from).not.toHaveBeenCalled();
      expect(mocks.moderate).not.toHaveBeenCalled();
    },
  );
  it("returns only availability and never calls AI or records attempts", async () => {
    expect(await call(checkHandle)).toEqual({ available: true });
    taken.data = [{ id: "other" }];
    expect(await call(checkHandle)).toEqual({ available: false });
    taken.error = {};
    expect(await call(checkHandle)).toEqual({ available: false });
    expect(mocks.moderate).not.toHaveBeenCalled();
    expect(mocks.admin.rpc).not.toHaveBeenCalled();
  });
  it("refuses demo, malformed handles and role failures", async () => {
    expect(await call(checkHandle, "admin")).toEqual({ available: false });
    roleResult.data = true;
    expect(await call(checkHandle)).toEqual({ available: false });
    roleResult.data = false;
    roleResult.error = {};
    expect(await call(checkHandle)).toEqual({ available: false });
  });
});
describe("handle saves", () => {
  it.each([42, null, {}, ["Alison_42"]])(
    "rejects non-string handle input %j without moderation or writes",
    async (handle) => {
      expect(await call(saveHandle, handle)).toEqual({
        outcome: "rejected",
        message: "Use 3 to 20 characters.",
      });
      expect(mocks.admin.rpc).toHaveBeenCalledWith("consume_handle_save_attempt", {
        _user_id: "caller",
      });
      expect(mocks.admin.from).not.toHaveBeenCalled();
      expect(mocks.moderate).not.toHaveBeenCalled();
    },
  );
  it("persists a terminal block with a null run id when the gateway supplies none", async () => {
    const updateSettings = vi.fn(() => chain(persist));
    mocks.admin.from.mockImplementation((table: string) => {
      const c = chain(table === "profiles" ? taken : settings);
      c["update"] = table === "app_settings" ? updateSettings : vi.fn(() => chain(updated));
      return c;
    });
    mocks.moderate.mockResolvedValue({ outcome: "unavailable", block: "credit_block" });
    expect(await call(saveHandle)).toEqual({ outcome: "unavailable", message: HANDLE_UNAVAILABLE });
    expect(updateSettings).toHaveBeenCalledWith({
      handle_check_block_category: "credit_block",
      handle_check_blocked_at: expect.any(String),
      handle_check_run_id: null,
    });
  });
  it("writes only a verified caller's handle after approval", async () => {
    expect(await call(saveHandle)).toEqual({
      outcome: "changed",
      message: "Changes saved.",
      handle: "Alison_42",
    });
    expect(mocks.moderate).toHaveBeenCalledWith("Alison_42");
    expect(mocks.admin.rpc).toHaveBeenCalledWith("consume_handle_save_attempt", {
      _user_id: "caller",
    });
  });
  it("refuses demo before consuming quota or calling AI", async () => {
    roleResult.data = true;
    expect(await call(saveHandle)).toEqual({ outcome: "demo", message: DEMO_MESSAGE });
    expect(mocks.admin.from).not.toHaveBeenCalled();
    expect(mocks.admin.rpc).not.toHaveBeenCalled();
    expect(mocks.moderate).not.toHaveBeenCalled();
  });
  it("keeps old handle on role, quota and settings failures", async () => {
    roleResult.error = {};
    expect((await call(saveHandle))["message"]).toBe(HANDLE_UNAVAILABLE);
    roleResult.error = null;
    attempt.error = {};
    expect((await call(saveHandle))["message"]).toBe(HANDLE_UNAVAILABLE);
    attempt.error = null;
    attempt.data = false;
    expect((await call(saveHandle))["message"]).toBe(RATE_LIMIT_MESSAGE);
    attempt.data = true;
    settings.error = {};
    expect((await call(saveHandle))["message"]).toBe(HANDLE_UNAVAILABLE);
    expect(mocks.moderate).not.toHaveBeenCalled();
  });
  it("rejects invalid, reserved or taken handles without AI", async () => {
    expect((await call(saveHandle, "ADMIN"))["message"]).toBe(
      "That handle is reserved. Choose another.",
    );
    expect((await call(saveHandle, "rowan!"))["message"]).toBe(
      "Use letters, numbers, and underscores only.",
    );
    taken.data = [{ id: "other" }];
    expect((await call(saveHandle))["message"]).toBe(HANDLE_TAKEN);
    taken.error = {};
    expect((await call(saveHandle))["message"]).toBe(HANDLE_UNAVAILABLE);
    expect(mocks.moderate).not.toHaveBeenCalled();
  });
  it("active blocks preserve handle and prevent new calls", async () => {
    settings.data = { handle_check_block_category: "credit_block" };
    expect((await call(saveHandle))["message"]).toBe(HANDLE_UNAVAILABLE);
    expect(mocks.moderate).not.toHaveBeenCalled();
  });
  it("transient failure creates no block and next save tries again", async () => {
    mocks.moderate.mockResolvedValueOnce({ outcome: "unavailable", block: null });
    expect((await call(saveHandle))["message"]).toBe(HANDLE_UNAVAILABLE);
    expect((await call(saveHandle))["outcome"]).toBe("changed");
    expect(mocks.moderate).toHaveBeenCalledTimes(2);
  });
  it.each(["provider_access_denied", "credit_block"])(
    "persists %s without updating the handle",
    async (block) => {
      mocks.moderate.mockResolvedValue({ outcome: "unavailable", block, runId: "safe-id" });
      expect((await call(saveHandle))["message"]).toBe(HANDLE_UNAVAILABLE);
      expect(mocks.admin.from).toHaveBeenCalledWith("app_settings");
      persist.error = {};
      await expect(call(saveHandle)).rejects.toThrow("Could not persist");
    },
  );
  it("rejection and a concurrent unique collision preserve the old handle", async () => {
    mocks.moderate.mockResolvedValueOnce({ outcome: "rejected", block: null });
    expect((await call(saveHandle))["message"]).toBe(HANDLE_REJECTED);
    updated.error = { code: "23505" };
    expect((await call(saveHandle))["message"]).toBe(HANDLE_REJECTED);
  });
});
describe("manual recovery", () => {
  it("only non-demo admins can inspect or reset state", async () => {
    for (const value of [[], [{ role: "demo" }, { role: "admin" }]]) {
      roles.data = value;
      expect(await call(getHandleCheckStatus)).toEqual({ allowed: false });
      expect(await call(resumeHandleChecks)).toEqual({ resumed: false });
    }
    roles.error = {};
    expect(await call(getHandleCheckStatus)).toEqual({ allowed: false });
    expect(await call(resumeHandleChecks)).toEqual({ resumed: false });
  });
  it("shows status and clears explicitly without an AI call", async () => {
    expect(await call(getHandleCheckStatus)).toEqual({
      allowed: true,
      category: null,
      blockedAt: null,
    });
    expect(await call(resumeHandleChecks)).toEqual({ resumed: true });
    persist.error = {};
    expect(await call(resumeHandleChecks)).toEqual({ resumed: false });
    settings.error = {};
    await expect(call(getHandleCheckStatus)).rejects.toThrow();
    expect(mocks.moderate).not.toHaveBeenCalled();
  });
});
