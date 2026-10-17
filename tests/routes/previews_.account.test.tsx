import { expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";
import { routeTree } from "@/routeTree.gen";
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      to,
      children,
      className,
    }: {
      to: string;
      children: ReactNode;
      className?: string;
    }) => (
      <a href={to} className={className}>
        {children}
      </a>
    ),
  };
});

function routerAt(path: string) {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient: new QueryClient() },
  });
}

it.each(["explore", "homepage-featured"])(
  "resolves /previews/%s as an unnested sample page",
  async (page) => {
    const router = routerAt(`/previews/${page}`);
    await router.load();
    expect(router.state.matches.at(-1)?.routeId).toBe(`/previews_/${page}`);
    expect(router.state.matches.map((match) => match.routeId)).not.toContain("/previews");
    expect(router.state.matches.at(-1)?.status).toBe("success");
  },
);

it("resolves /previews/account to its own route, not the /previews list", async () => {
  const router = routerAt("/previews/account");
  await router.load();
  const leaf = router.state.matches.at(-1);
  expect(leaf?.routeId).toBe("/previews_/account");
});

it("renders the account previews gallery with its heading", async () => {
  const router = routerAt("/previews/account");
  await router.load();
  const route = router.routesById["/previews_/account"];
  const Page = route.options.component as ComponentType;
  render(<Page />);
  expect(await screen.findByRole("heading", { name: "Account previews" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "AI check status, Blocked" })).toBeInTheDocument();
});

it("refuses preview form submissions without making authentication calls", async () => {
  const router = routerAt("/previews/account");
  await router.load();
  const route = router.routesById["/previews_/account"];
  const Page = route.options.component as ComponentType;
  render(<Page />);
  for (const title of [
    "Sign in, wrong password",
    "Sign up, email already has an account",
    "Sign up, weak password",
    "Sign up, breached password",
  ]) {
    const section = screen.getByRole("region", { name: title });
    const button = within(section).getByRole("button", { name: /Sign In|Create Account/ });
    const form = button.closest("form");
    if (!form) throw new Error("Preview form missing");
    expect(fireEvent.submit(form)).toBe(false);
  }
  const { supabase } = await import("@/integrations/supabase/client");
  expect(supabase.auth.signUp).not.toHaveBeenCalled();
  expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
});
