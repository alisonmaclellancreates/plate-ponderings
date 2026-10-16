import { expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";

it("renders /settings/delete-confirm through the router as its own page", async () => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/settings/delete-confirm"] }),
    context: { queryClient: new QueryClient() },
  });
  render(<RouterProvider router={router} />);
  expect(
    await screen.findByRole("heading", { name: "Delete your account?" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Keep My Account" })).toHaveAttribute(
    "href",
    "/settings",
  );
});
