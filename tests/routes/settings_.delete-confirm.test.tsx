import { expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { routeTree } from "@/routeTree.gen";

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
  expect(leaf?.routeId).toBe("/settings_/delete-confirm");
});

it("renders the matched route's page with the confirmation and Keep My Account", async () => {
  const router = routerAt("/settings/delete-confirm");
  await router.load();
  const route = router.routesById["/settings_/delete-confirm"];
  const Page = route.options.component as ComponentType;
  render(<Page />);
  expect(await screen.findByRole("heading", { name: "Delete your account?" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Keep My Account" })).toHaveAttribute(
    "href",
    "/settings",
  );
});
