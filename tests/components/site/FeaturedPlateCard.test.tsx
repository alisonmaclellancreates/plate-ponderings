import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ params, children, ...props }: { params: { state: string }; children: ReactNode }) => (
    <a {...props} href={`/plate/${params.state}`}>
      {children}
    </a>
  ),
}));
import { FeaturedPlateCard } from "@/components/site/FeaturedPlateCard";
import { featuredPlates, featuredProgress, publishedStories } from "@/lib/mock-data";

it.each(featuredPlates())(
  "renders published counts, status and progress for $text",
  (plate) => {
    render(<FeaturedPlateCard plate={plate} />);
    const n = publishedStories(plate).length;
    expect(screen.getByText(`${n} ${n === 1 ? "story" : "stories"}`)).toBeTruthy();
    expect(screen.getByText(featuredProgress(plate.featuredStoryCount ?? 0, n))).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe(`/plate/${plate.slug}`);
    expect(screen.queryByText("Today")).toBeNull();
    if (n === 0) expect(screen.getByText("Mystery")).toBeTruthy();
  },
);

it("names the card link with the plate, date, count, badge and progress", () => {
  const plate = featuredPlates().find((p) => p.slug === "ut-canyons");
  if (!plate) throw new Error("Missing CANYONS");
  render(<FeaturedPlateCard plate={plate} />);
  const name = screen.getByRole("link").textContent ?? "";
  const link = screen.getByRole("link", { name: /Utah plate CANYONS/ });
  expect(link.getAttribute("aria-label")).toBeNull();
  expect(screen.getByRole("link", { name: /Featured Oct 16, 2026/ })).toBe(link);
  expect(screen.getByRole("link", { name: /Still a mystery/ })).toBe(link);
  expect(name).toContain("0 stories");
});
