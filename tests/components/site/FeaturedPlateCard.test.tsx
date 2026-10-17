import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
import { track } from "@/lib/analytics";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ params, children, ...props }: { params: { state: string }; children: ReactNode }) => (
    <a {...props} href={`/plate/${params.state}`}>
      {children}
    </a>
  ),
}));
import { FeaturedPlateCard } from "@/components/site/FeaturedPlateCard";
import {
  asFeatured,
  featuredPlates,
  featuredProgress,
  publishedStories,
} from "../../fixtures/plates";

it.each(featuredPlates())("renders published counts, status and progress for $text", (plate) => {
  render(<FeaturedPlateCard plate={asFeatured(plate)} />);
  const n = publishedStories(plate).length;
  expect(screen.getByText(`${n} ${n === 1 ? "story" : "stories"}`)).toBeTruthy();
  expect(screen.getByText(featuredProgress(plate.featuredStoryCount ?? 0, n))).toBeTruthy();
  expect(screen.getByRole("link").getAttribute("href")).toBe(`/plate/${plate.slug}`);
  expect(screen.queryByText("Today")).toBeNull();
  if (n === 0) expect(screen.getByText("Mystery")).toBeTruthy();
});

it("opens a real featured plate with only the planned event properties", async () => {
  render(
    <FeaturedPlateCard
      utcToday="2026-10-17"
      today
      plate={{
        slug: "real-plate-id",
        jurisdiction: "Ontario",
        text: "REAL",
        day: "2026-10-17",
        count: 1,
        atPick: 0,
        status: "owner",
      }}
    />,
  );
  await userEvent.setup().click(screen.getByRole("link"));
  expect(screen.getByRole("link").getAttribute("href")).toBe("/plate/real-plate-id");
  expect(track).toHaveBeenLastCalledWith("featured_subject_opened", {
    is_mystery: false,
    days_ago: 0,
  });
});

it("names the card link with the plate, date, count, badge and progress", () => {
  const plate = featuredPlates().find((p) => p.slug === "ut-canyons");
  if (!plate) throw new Error("Missing CANYONS");
  render(<FeaturedPlateCard plate={asFeatured(plate)} />);
  const name = screen.getByRole("link").textContent ?? "";
  const link = screen.getByRole("link", { name: /Utah plate CANYONS/ });
  expect(link.getAttribute("aria-label")).toBeNull();
  expect(screen.getByRole("link", { name: /Featured Oct 16, 2026/ })).toBe(link);
  expect(screen.getByRole("link", { name: /Still a mystery/ })).toBe(link);
  expect(name).toContain("0 stories");
});
