import { expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import type { FeaturedDisplay } from "@/lib/featured";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ params, children, ...props }: { params: { state: string }; children: ReactNode }) => (
    <a {...props} href={`/plate/${params.state}`}>
      {children}
    </a>
  ),
}));
import { Explore } from "@/components/site/Explore";

it("loads real pages and focuses the first new date, even for a repeated plate", async () => {
  const row = (day: string): FeaturedDisplay => ({
    slug: "real-id",
    jurisdiction: "Ontario",
    text: "REAL",
    day,
    count: 0,
    atPick: 0,
    status: "mystery",
  });
  const load = vi.fn();
  function Archive() {
    const [more, setMore] = useState(false);
    return (
      <Explore
        live={{
          today: "2026-10-17",
          plates: more ? [row("2026-10-17"), row("2026-09-01")] : [row("2026-10-17")],
          hasMore: !more,
          busy: false,
          loadMore: async () => {
            load();
            setMore(true);
          },
        }}
      />
    );
  }
  render(<Archive />);
  expect(screen.getByText("Today")).toBeTruthy();
  await userEvent.setup().click(screen.getByRole("button", { name: "Load More" }));
  expect(load).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(document.activeElement).toBe(screen.getAllByRole("link")[1]));
  expect(screen.queryByRole("button", { name: "Load More" })).toBeNull();
});
it("disables Load More while a real page is being fetched", () => {
  render(
    <Explore
      live={{ today: "2026-10-17", plates: [], hasMore: true, busy: true, loadMore: vi.fn() }}
    />,
  );
  expect(screen.getByRole("button", { name: "Load More" })).toBeDisabled();
});
it("keeps the archive and retries an inline read failure", async () => {
  const retry = vi.fn().mockResolvedValue(undefined);
  const live = {
    today: "",
    plates: [],
    hasMore: false,
    busy: false,
    loadMore: vi.fn(),
    error: true,
    retry,
  };
  const { rerender } = render(<Explore live={live} />);
  expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  expect(screen.getByRole("alert")).toBeTruthy();
  await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledTimes(1);
  rerender(<Explore live={{ ...live, busy: true }} />);
  expect(screen.getByRole("button", { name: "Try again" })).toBeDisabled();
  rerender(<Explore live={{ ...live, error: false }} />);
  expect(screen.queryByRole("alert")).toBeNull();
});
