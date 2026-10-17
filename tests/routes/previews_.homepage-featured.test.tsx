import { expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { getFeaturedHome, getFeaturedArchive } from "@/lib/featured.functions";
import { getPlateSummary } from "@/lib/summaries.functions";

vi.mock("@/lib/featured.functions", () => ({
  getFeaturedArchive: vi.fn(),
  getFeaturedHome: vi.fn(),
}));
vi.mock("@/lib/summaries.functions", () => ({ getPlateSummary: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (id: string) => (options: Record<string, unknown>) => ({ ...options, id }),
  Link: ({ params, children }: { params: { state: string }; children: ReactNode }) => (
    <a href={`/plate/${params.state}`}>{children}</a>
  ),
}));
import { Route } from "@/routes/previews_.homepage-featured";

it("uses an unnested sample-only route with real mystery and fallback bands and a full shelf", () => {
  const route = Route as unknown as {
    id: string;
    loader?: unknown;
    component: () => ReactNode;
    head: () => { meta: Record<string, string>[] };
  };
  expect(route.id).toBe("/previews_/homepage-featured");
  expect(route.loader).toBeUndefined();
  const Page = route.component;
  render(<Page />);
  for (const [name, copy] of [
    ["Mystery", "No stories yet."],
    ["Fallback, singular", "Only 1 story so far."],
    ["Fallback, plural", "Only 2 stories so far."],
  ] as const) {
    const section = screen.getByRole("region", { name });
    expect(section.textContent).toContain(copy);
    expect(within(section).getByRole("link", { name: "View This Plate" })).toBeTruthy();
  }
  expect(screen.getAllByRole("region", { name: "Plate of the Day" })).toHaveLength(3);
  const shelf = screen.getByRole("region", { name: "Recently Featured" });
  expect(within(shelf).getAllByRole("listitem")).toHaveLength(4);
  expect(getFeaturedHome).not.toHaveBeenCalled();
  expect(getFeaturedArchive).not.toHaveBeenCalled();
  expect(getPlateSummary).not.toHaveBeenCalled();
  expect(route.head().meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(
    "Homepage featured samples | What the Plate?",
  );
});
