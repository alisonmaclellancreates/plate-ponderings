import { afterEach, beforeEach, expect, it, vi } from "vitest";
const user = vi.hoisted(() => vi.fn());
const out = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: user, signOut: out } },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => o,
  Outlet: () => null,
  redirect: (options: unknown) => ({ options }),
}));
import { GUARD_TIMEOUT_MS } from "@/lib/session-check";
import { Route as Gate } from "@/routes/_authenticated/route";
import { Route as Adapter } from "@/routes/auth";
import { Route as SignIn } from "@/routes/sign-in";
import { Route as SignUp } from "@/routes/sign-up";
type Options = {
  beforeLoad: (a: unknown) => Promise<unknown>;
  validateSearch: (s: unknown) => { returnTo: string };
  head: () => unknown;
  ssr: boolean;
};
const gate = Gate as unknown as Options;
const adapter = Adapter as unknown as Options;
beforeEach(() => {
  user.mockReset();
  out.mockReset();
});
afterEach(() => vi.useRealTimers());
it("gates protected children client-side with a safe return path", async () => {
  user.mockResolvedValue({ data: { user: null }, error: null });
  expect(gate.ssr).toBe(false);
  await expect(gate.beforeLoad({ location: { href: "/profile" } })).rejects.toEqual({
    options: { to: "/auth", search: { returnTo: "/profile" } },
  });
  user.mockResolvedValue({ data: { user: {} }, error: {} });
  await expect(gate.beforeLoad({ location: { href: "/spot" } })).rejects.toEqual({
    options: { to: "/auth", search: { returnTo: "/spot" } },
  });
  user.mockResolvedValue({ data: { user: {} }, error: null });
  await expect(gate.beforeLoad({ location: { href: "/profile" } })).resolves.toBeUndefined();
});
it("auth is only an adapter, preserves return paths and rejects external redirects", () => {
  expect(adapter.validateSearch({ redirect: "/profile" })).toEqual({ returnTo: "/profile" });
  expect(adapter.validateSearch({ returnTo: "//evil.example" })).toEqual({ returnTo: "/" });
  expect(() => adapter.beforeLoad({ search: { returnTo: "/profile" } })).toThrow();
  expect(adapter.head()).toBeDefined();
});
it("entry routes sanitize optional return searches", () => {
  for (const route of [SignIn, SignUp]) {
    const r = route as unknown as Options;
    expect(r.validateSearch({ returnTo: "/profile" })).toEqual({ returnTo: "/profile" });
    expect(r.validateSearch({})).toEqual({ returnTo: "/" });
  }
});
it("redirects safely rather than waiting forever on a stuck session", async () => {
  vi.useFakeTimers();
  user.mockReturnValue(new Promise(() => {}));
  const result = expect(gate.beforeLoad({ location: { href: "/profile" } })).rejects.toEqual({
    options: { to: "/auth", search: { returnTo: "/profile" } },
  });
  await vi.advanceTimersByTimeAsync(GUARD_TIMEOUT_MS);
  await result;
  expect(out).not.toHaveBeenCalled();
});
it("lets a slow visitor through once the check resolves", async () => {
  vi.useFakeTimers();
  user.mockImplementation(
    () =>
      new Promise(
        (resolve) => setTimeout(() => resolve({ data: { user: {} }, error: null }), 2000),
      ),
  );
  const result = gate.beforeLoad({ location: { href: "/profile" } });
  await vi.advanceTimersByTimeAsync(2000);
  await expect(result).resolves.toBeUndefined();
});
