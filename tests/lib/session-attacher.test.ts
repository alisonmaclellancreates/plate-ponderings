import { afterEach, beforeEach, expect, it, vi } from "vitest";
const session = vi.hoisted(() => vi.fn());
type Handler = (args: { next: (opts: unknown) => unknown }) => Promise<unknown>;
vi.mock("@tanstack/react-start", () => ({
  createMiddleware: () => ({ client: (fn: Handler) => fn }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: session } } }));
import { attachSession } from "@/lib/session-attacher";
const attach = attachSession as unknown as Handler;
beforeEach(() => {
  vi.useFakeTimers();
  session.mockReset();
});
afterEach(() => vi.useRealTimers());
it("attaches the fresh token after normal renewal within one second", async () => {
  session.mockImplementation(
    () =>
      new Promise((resolve) =>
        setTimeout(
          () => resolve({ data: { session: { access_token: "fresh-token" } }, error: null }),
          900,
        ),
      ),
  );
  const next = vi.fn(() => "public-result");
  const result = attach({ next });
  await vi.advanceTimersByTimeAsync(900);
  expect(await result).toBe("public-result");
  expect(next).toHaveBeenCalledExactlyOnceWith({
    headers: { Authorization: "Bearer fresh-token" },
  });
});
it.each([null, {}])("continues without a token for empty session %s", async (saved) => {
  session.mockResolvedValue({ data: { session: saved }, error: null });
  const next = vi.fn(() => "public-result");
  expect(await attach({ next })).toBe("public-result");
  expect(next).toHaveBeenCalledWith({ headers: {} });
});
it("ignores session data returned alongside an auth error", async () => {
  session.mockResolvedValue({
    data: { session: { access_token: "bad" } },
    error: new Error("renewal"),
  });
  const next = vi.fn();
  await attach({ next });
  expect(next).toHaveBeenCalledWith({ headers: {} });
});
it.each(["throw", "reject"])("continues public calls when getSession %s", async (kind) => {
  if (kind === "throw")
    session.mockImplementation(() => {
      throw new Error("storage");
    });
  else session.mockRejectedValue(new Error("network"));
  const next = vi.fn(() => "public-result");
  expect(await attach({ next })).toBe("public-result");
  expect(next).toHaveBeenCalledExactlyOnceWith({ headers: {} });
});
it("continues once after one second, even if renewal later finishes", async () => {
  let resolve: (value: unknown) => void = () => {};
  session.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const next = vi.fn(() => "public-result");
  const result = attach({ next });
  await vi.advanceTimersByTimeAsync(999);
  expect(next).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(await result).toBe("public-result");
  expect(next).toHaveBeenCalledExactlyOnceWith({ headers: {} });
  resolve({ data: { session: { access_token: "late" } } });
  await vi.advanceTimersByTimeAsync(0);
  expect(next).toHaveBeenCalledTimes(1);
});
it("does not hide failures from the actual public/server call", async () => {
  session.mockResolvedValue({ data: { session: null } });
  const error = new Error("server refusal");
  await expect(attach({ next: () => Promise.reject(error) })).rejects.toBe(error);
});
