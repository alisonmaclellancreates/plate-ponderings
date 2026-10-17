import { expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { getFeaturedArchive, getFeaturedHome } from "@/lib/featured.functions";

vi.mock("@/lib/featured.functions", () => ({
  getFeaturedArchive: vi.fn(),
  getFeaturedHome: vi.fn(),
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (id: string) => (options: Record<string, unknown>) => ({ ...options, id }),
  Link: ({ params, children }: { params: { state: string }; children: ReactNode }) => (
    <a href={`/plate/${params.state}`}>{children}</a>
  ),
}));
import { Route } from "@/routes/previews_.explore";

it("uses the unnested preview route and sample-only grid with all progress states and Load More", async () => {
  const route = Route as unknown as {
    id: string;
    loader?: unknown;
    component: () => ReactNode;
    head: () => { meta: Record<string, string>[] };
  };
  expect(route.id).toBe("/previews_/explore");
  expect(route.loader).toBeUndefined();
  const Page = route.component;
  render(<Page />);
  const grid = screen.getByRole("region", { name: "Featured plates" });
  expect(within(grid).getAllByRole("listitem")).toHaveLength(12);
  const first = within(grid).getAllByRole("listitem")[0];
  if (!first) throw new Error("Missing first card");
  expect(within(first).getByText("Today")).toBeTruthy();
  expect(within(first).getByRole("link").getAttribute("href")).toBe("/plate/ut-canyons");
  for (const line of [
    "Still a mystery",
    "Was a mystery, now 1 story",
    "Was a mystery, now 2 stories",
    "Had 2 stories when featured, now 2",
  ]) {
    expect(within(grid).getAllByText(line).length).toBeGreaterThan(0);
  }
  await userEvent.setup().click(screen.getByRole("button", { name: "Load More" }));
  expect(within(grid).getAllByRole("listitem")).toHaveLength(14);
  expect(screen.queryByRole("button", { name: "Load More" })).toBeNull();
  expect(getFeaturedArchive).not.toHaveBeenCalled();
  expect(getFeaturedHome).not.toHaveBeenCalled();
  expect(route.head().meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(
    "Archive sample preview | What the Plate?",
  );
});
