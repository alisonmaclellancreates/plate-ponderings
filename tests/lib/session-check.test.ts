import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ user: vi.fn(), out: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: m.user, signOut: m.out } },
}));
import { AUTH_TIMEOUT_MS, checkSignedIn } from "@/lib/session-check";
beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  m.out.mockResolvedValue({ error: null });
});
afterEach(() => vi.useRealTimers());
it("returns the verified user without clearing a healthy session", async () => {
  const user = { id: "verified" };
  m.user.mockResolvedValue({ data: { user }, error: null });
  expect(await checkSignedIn()).toBe(user);
  expect(m.out).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
it.each([401, 403])("clears a definitely rejected session (%s)", async (status) => {
  m.user.mockResolvedValue({ data: { user: null }, error: { status } });
  expect(await checkSignedIn()).toBeNull();
  expect(m.out).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
});
it.each([0, 429, 500])("does not clear a recoverable auth error (%s)", async (status) => {
  m.user.mockResolvedValue({ data: { user: null }, error: { status } });
  expect(await checkSignedIn()).toBeNull();
  expect(m.out).not.toHaveBeenCalled();
});
it.each(["throw", "reject"])("does not clear on network/storage %s", async (kind) => {
  if (kind === "throw")
    m.user.mockImplementation(() => {
      throw new Error("storage");
    });
  else m.user.mockRejectedValue(new Error("network"));
  expect(await checkSignedIn()).toBeNull();
  expect(m.out).not.toHaveBeenCalled();
});
it("returns signed out when no saved session exists", async () => {
  m.user.mockResolvedValue({ data: { user: null }, error: null });
  expect(await checkSignedIn()).toBeNull();
  expect(m.out).not.toHaveBeenCalled();
});
it("remains signed out if rejection cleanup throws", async () => {
  m.user.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
  m.out.mockRejectedValue(new Error("storage"));
  expect(await checkSignedIn()).toBeNull();
  expect(m.out).toHaveBeenCalledWith({ scope: "local" });
});
it("bounds a stuck check without clearing anything or requiring a callback", async () => {
  m.user.mockReturnValue(new Promise(() => {}));
  const result = checkSignedIn();
  await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS);
  expect(await result).toBeNull();
  expect(m.out).not.toHaveBeenCalled();
});
it("delivers late success after temporarily returning signed out", async () => {
  let resolve: (value: unknown) => void = () => {};
  m.user.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const late = vi.fn().mockResolvedValue(undefined);
  const result = checkSignedIn(late);
  await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS);
  expect(await result).toBeNull();
  expect(late).not.toHaveBeenCalled();
  resolve({ data: { user: { id: "late" } }, error: null });
  await vi.advanceTimersByTimeAsync(0);
  expect(late).toHaveBeenCalledWith({ id: "late" });
  expect(m.out).not.toHaveBeenCalled();
});
it("handles failed late account hydration without an unhandled rejection", async () => {
  let resolve: (value: unknown) => void = () => {};
  m.user.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const late = vi.fn().mockRejectedValue(new Error("account unavailable"));
  const result = checkSignedIn(late);
  await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS);
  await result;
  resolve({ data: { user: { id: "late" } } });
  await vi.advanceTimersByTimeAsync(0);
  expect(late).toHaveBeenCalledWith({ id: "late" });
});
