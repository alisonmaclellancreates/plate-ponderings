import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";

vi.mock("@/lib/account-auth", () => ({
  useAccountAuth: () => ({ account: { handle: "Traveler1234", isAdmin: true }, signOut: vi.fn() }),
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: undefined }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/submissions.functions", () => ({ getUnreadDot: vi.fn() }));

import { SiteHeader } from "@/components/site/SiteHeader";

it("closes both menus on real router navigation, browser back and browser forward", async () => {
  const root = createRootRoute({ component: () => <SiteHeader /> });
  const routes = ["/", "/profile"].map((path) => createRoute({ getParentRoute: () => root, path }));
  const history = createMemoryHistory({ initialEntries: ["/"] });
  const router = createRouter({ routeTree: root.addChildren(routes), history });
  render(<RouterProvider router={router} />);
  await screen.findByRole("button", { name: "Open menu" });
  function openMenus() {
    for (const toggle of screen.getAllByRole("button", { name: "Traveler1234 menu" }))
      fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getAllByRole("list", { name: "Profile" })).toHaveLength(2);
    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeInTheDocument();
  }
  async function expectClosed(pathname: string) {
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(pathname);
      expect(screen.queryAllByRole("list", { name: "Profile" })).toHaveLength(0);
      expect(screen.queryByRole("navigation", { name: "Mobile" })).toBeNull();
    });
  }
  openMenus();
  await act(async () => {
    await router.navigate({ to: "/profile" });
  });
  await expectClosed("/profile");
  openMenus();
  await act(async () => history.back());
  await expectClosed("/");
  openMenus();
  await act(async () => history.forward());
  await expectClosed("/profile");
});
