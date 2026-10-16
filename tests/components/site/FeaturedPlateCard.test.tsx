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
import { PLATES, featuredProgress, publishedStories } from "@/lib/mock-data";

it.each(PLATES.filter((p) => p.plateOfTheDay))(
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
