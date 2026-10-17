import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  expect(screen.getByRole("heading", { name: "Handle check status, Blocked" })).toBeInTheDocument();
});
