import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";
import { routeTree } from "@/routeTree.gen";
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: { id: "test" } }, error: null }) } },
}));

vi.mock("@/components/site/LiveSettings", async () => {
  const { DeleteConfirmPage } = await import("@/components/site/Settings");
  return { LiveDeleteConfirm: () => <DeleteConfirmPage />, LiveSettings: () => null };
});

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

it("resolves /settings/delete-confirm to its own route, not /settings", async () => {
  const router = routerAt("/settings/delete-confirm");
  await router.load();
  const leaf = router.state.matches.at(-1);
  expect(leaf?.routeId).toBe("/_authenticated/settings_/delete-confirm");
});

it("renders the matched route's page with the confirmation and Keep My Account", async () => {
  const router = routerAt("/settings/delete-confirm");
  await router.load();
  const route = router.routesById["/_authenticated/settings_/delete-confirm"];
  const Page = route.options.component as ComponentType;
  render(<Page />);
  expect(await screen.findByRole("heading", { name: "Delete your account?" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Keep My Account" })).toHaveAttribute(
    "href",
    "/settings",
  );
});
