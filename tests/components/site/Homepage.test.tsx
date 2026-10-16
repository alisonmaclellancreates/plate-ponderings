import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Homepage, HEADLINES, ROTATE_MS, PlateOfTheDay } from "@/components/site/Homepage";
import type { PlateRecord } from "@/lib/mock-data";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ params, children, ...props }: { params: { state: string }; children: ReactNode }) => (
    <a {...props} href={`/plate/${params.state}`}>
      {children}
    </a>
  ),
}));

function media({ mobile = false, reduced = false }) {
  window.matchMedia = vi.fn((q: string) => ({
    matches: q.includes("max-width") ? mobile : q.includes("reduced") ? reduced : false,
  })) as unknown as typeof window.matchMedia;
}
const visibleHeadline = () =>
  screen.getByRole("heading", { level: 1 }).querySelector('[aria-hidden="false"]')?.textContent;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Homepage", () => {
  it.each([
    { reduced: false, behavior: "smooth" },
    { reduced: true, behavior: "instant" },
  ])("focuses the jurisdiction field with $behavior scrolling", async ({ reduced, behavior }) => {
    media({ reduced });
    const user = userEvent.setup();
    render(<Homepage />);
    const searchCard = screen.getByRole("search", { name: "Look up a plate" });
    const scrollIntoView = vi.fn();
    searchCard.scrollIntoView = scrollIntoView;
    const button = screen.getByRole("button", { name: "Look Up a Plate" });
    button.focus();

    await user.keyboard("{Enter}");

    expect(document.activeElement).toBe(
      screen.getByRole("combobox", { name: "State or Province" }),
    );
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior, block: "center" });
  });

  it("rotates headlines on desktop every interval", () => {
    vi.useFakeTimers();
    media({});
    const { unmount } = render(<Homepage />);
    expect(visibleHeadline()).toBe(HEADLINES[0]);
    act(() => vi.advanceTimersByTime(ROTATE_MS));
    expect(visibleHeadline()).toBe(HEADLINES[1]);
    act(() => vi.advanceTimersByTime(ROTATE_MS * 2));
    expect(visibleHeadline()).toBe(HEADLINES[0]);
    unmount();
  });

  it("holds the first headline for reduced motion", () => {
    vi.useFakeTimers();
    media({ reduced: true });
    render(<Homepage />);
    act(() => vi.advanceTimersByTime(ROTATE_MS * 3));
    expect(visibleHeadline()).toBe(HEADLINES[0]);
  });

  it("picks one random headline on mobile and never rotates", () => {
    vi.useFakeTimers();
    media({ mobile: true });
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    render(<Homepage />);
    expect(visibleHeadline()).toBe(HEADLINES[2]);
    act(() => vi.advanceTimersByTime(ROTATE_MS * 2));
    expect(visibleHeadline()).toBe(HEADLINES[2]);
  });

  it("default shows the mystery plate of the day and four recent plates", () => {
    media({});
    render(<Homepage />);
    const potd = screen.getByRole("region", { name: "Plate of the Day" });
    expect(within(potd).getByRole("img", { name: /Utah plate CANYONS/ })).toBeTruthy();
    expect(within(potd).getByText("Mystery")).toBeTruthy();
    const recent = screen.getByRole("region", { name: "Recently Featured" });
    expect(within(recent).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.queryByRole("region", { name: /No plate found/ })).toBeNull();
    expect(screen.getAllByRole("search").length).toBeGreaterThan(0);
  });

  it("no-match prefills the search and shows the panel", () => {
    media({});
    render(<Homepage variant="no-match" />);
    expect(screen.getAllByDisplayValue("DRAGON").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("region", { name: "No plate found. Yet!" }).length).toBeGreaterThan(
      0,
    );
  });

  it("fallback features an interpreted plate", () => {
    media({});
    render(<Homepage variant="fallback" />);
    const potd = screen.getByRole("region", { name: "Plate of the Day" });
    expect(within(potd).getByText("Interpreted")).toBeTruthy();
    expect(within(potd).getByText(/Only 2 stories so far/)).toBeTruthy();
    expect(within(potd).getByRole("link", { name: "View This Plate" }).getAttribute("href")).toBe(
      "/plate/co-wander",
    );
  });

  it("default Plate of the Day links to today's plate", () => {
    media({});
    render(<Homepage />);
    const potd = screen.getByRole("region", { name: "Plate of the Day" });
    expect(within(potd).getByRole("link", { name: "View This Plate" }).getAttribute("href")).toBe(
      "/plate/ut-canyons",
    );
  });

  it("reads a plate with exactly one story as 1 story", () => {
    media({});
    const plate: PlateRecord = {
      slug: "or-single",
      jurisdiction: "Oregon",
      text: "SINGLE",
      stories: [
        {
          id: "single-1",
          handle: "rivercat",
          date: "2026-10-14",
          meaning: "One story only.",
          howIKnow: "guess",
          hearts: 1,
        },
      ],
      summaries: [],
    };
    render(<PlateOfTheDay plate={plate} />);
    expect(screen.getByText(/Only 1 story so far/)).toBeTruthy();
    expect(screen.queryByText(/1 stories/)).toBeNull();
  });
});
