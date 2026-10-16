import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { Plate } from "@/components/site/Plate";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import {
  ConsensusBadge,
  HowIKnowBadge,
  ModerationBadge,
  StatusBadge,
} from "@/components/site/Badges";

describe("Plate", () => {
  it("names the plate and renders jurisdiction and text", () => {
    render(<Plate jurisdiction="Utah" text="CANYONS" size="lg" />);
    const plate = screen.getByRole("img", { name: "Utah plate CANYONS" });
    expect(plate).toHaveAttribute("data-size", "lg");
    expect(within(plate).getByText("Utah")).toHaveAttribute("data-tone", "ut");
  });

  it("defaults to medium and falls back to cream tone", () => {
    render(<Plate jurisdiction="Yukon" text="NORTH" />);
    const plate = screen.getByRole("img");
    expect(plate).toHaveAttribute("data-size", "md");
    expect(within(plate).getByText("Yukon")).toHaveAttribute("data-tone", "fallback");
  });

  it("renders long text on the plate", () => {
    render(<Plate jurisdiction="Ontario" text="ILUV2CODE" />);
    expect(screen.getByText("ILUV2CODE")).toHaveClass("plate-text");
  });
});

describe("badges", () => {
  it("renders every badge with words", () => {
    render(
      <>
        <StatusBadge status="owner" />
        <ConsensusBadge consensus="differ" />
        <HowIKnowBadge how="guess" />
        <ModerationBadge state="rejected" />
      </>,
    );
    expect(screen.getByText("Owner weighed in")).toHaveAttribute("data-tone", "teal");
    expect(screen.getByText("Opinions differ")).toHaveAttribute("data-tone", "coral");
    expect(screen.getByText("My best guess")).toHaveAttribute("data-kind", "how");
    expect(screen.getByText("Couldn't approve")).toHaveAttribute("data-kind", "moderation");
  });
});

describe("SiteHeader", () => {
  it("links home, shows the handle, notification and toggles the mobile menu", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "What the Plate? home" })).toHaveAttribute("href", "/");
    expect(screen.getAllByText("Traveler4821").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("notification-dot").length).toBeGreaterThan(0);
    const button = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(button);
    const mobile = screen.getByRole("navigation", { name: "Mobile" });
    expect(within(mobile).getByRole("link", { name: "Explore" })).toHaveAttribute(
      "href",
      "/explore",
    );
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("navigation", { name: "Mobile" })).toBeNull();
  });
});

describe("SiteFooter", () => {
  it("renders tagline, links and credit", () => {
    render(<SiteFooter />);
    expect(screen.getByText("Little plates. Big stories.")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Footer" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href")),
    ).toEqual(["/about", "/privacy", "/contact"]);
    expect(screen.getByText(/Built for #SheBuilds/)).toBeInTheDocument();
  });
});
