import { beforeEach, expect, it, vi } from "vitest";
const user = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: user } } }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => o,
  Outlet: () => null,
  redirect: (options: unknown) => ({ options }),
}));
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
beforeEach(() => user.mockReset());
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
