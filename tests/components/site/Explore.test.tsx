import { expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ params, children, ...props }: { params: { state: string }; children: ReactNode }) => (
    <a {...props} href={`/plate/${params.state}`}>
      {children}
    </a>
  ),
}));
import { Explore } from "@/components/site/Explore";
import { featuredPlates } from "@/lib/mock-data";

it("shows 12 newest plates with CANYONS today, then loads the remaining two", async () => {
  const user = userEvent.setup();
  render(<Explore />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("The Roadside Archive");
  expect(
    screen.getByText(
      "Every day, a new mystery takes the spotlight. Here's where you can revisit the plates we've featured along the way.",
    ),
  ).toBeTruthy();
  const grid = screen.getByRole("region", { name: "Featured plates" });
  expect(within(grid).getAllByRole("listitem")).toHaveLength(12);
  const first = within(grid).getAllByRole("listitem")[0];
  if (!first) throw new Error("Missing today's card");
  expect(within(first).getByText("Today")).toBeTruthy();
  expect(within(first).getByRole("link").getAttribute("href")).toBe("/plate/ut-canyons");
  expect(within(first).getByText("Still a mystery")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Load More" }));
  expect(within(grid).getAllByRole("listitem")).toHaveLength(14);
  expect(screen.queryByRole("button", { name: "Load More" })).toBeNull();
  expect(
    within(grid)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href")),
  ).toEqual(featuredPlates().map((p) => `/plate/${p.slug}`));
});
