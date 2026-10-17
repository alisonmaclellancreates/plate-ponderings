import { expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
const m = vi.hoisted(() => ({ failed: false, more: false, refetch: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => o,
}));
vi.mock("@/components/site/Explore", () => ({
  Explore: ({ live }: { live: { error: boolean; hasMore: boolean; retry: () => void } }) => (
    <>
      <p>archive</p>
      {live.hasMore && <p>more</p>}
      {live.error && (
        <div role="alert">
          <button onClick={live.retry}>Try again</button>
        </div>
      )}
    </>
  ),
}));
vi.mock("@tanstack/react-query", () => ({
  useSuspenseInfiniteQuery: () => ({
    data: { pages: [{ today: "2026-10-17", plates: [], error: m.failed }] },
    hasNextPage: m.more,
    isFetching: false,
    fetchNextPage: vi.fn(),
    refetch: m.refetch,
  }),
  queryOptions: (o: unknown) => o,
  infiniteQueryOptions: (o: unknown) => o,
}));
vi.mock("@/lib/featured.functions", () => ({
  getFeaturedHome: vi.fn(),
  getFeaturedArchive: vi.fn(),
}));
import { Route } from "@/routes/explore";
it("renders the archive with matching page and social metadata", () => {
  const r = Route as unknown as {
    component: () => ReactNode;
    head: () => { meta: Record<string, string>[] };
  };
  const C = r.component;
  expect(render(<C />).container.textContent).toBe("archive");
  const meta = r.head().meta;
  const title = meta.find((m) => "title" in m)?.["title"];
  expect(title).toBe("The Roadside Archive | What the Plate?");
  expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(title);
  expect(meta.find((m) => m["property"] === "og:description")?.["content"]).toBe(
    meta.find((m) => m["name"] === "description")?.["content"],
  );
});

it("keeps a failed archive inline and wires retry", () => {
  m.failed = true;
  try {
    const C = (Route as unknown as { component: () => ReactNode }).component;
    render(<C />);
    expect(screen.getByText("archive")).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(m.refetch).toHaveBeenCalled();
  } finally {
    m.failed = false;
  }
});

it("loads the matching infinite archive query", async () => {
  const r = Route as unknown as { loader: (args: unknown) => unknown };
  const ensureInfiniteQueryData = vi.fn().mockResolvedValue("archive");
  expect(await r.loader({ context: { queryClient: { ensureInfiniteQueryData } } })).toBe("archive");
  expect(ensureInfiniteQueryData).toHaveBeenCalledWith(
    expect.objectContaining({ queryKey: ["featured-archive"] }),
  );
});

it.each([
  [false, true],
  [true, false],
])(
  "offers more pages only when the archive has them and none failed (failed %s)",
  (failed, shown) => {
    m.more = true;
    m.failed = failed;
    try {
      const C = (Route as unknown as { component: () => ReactNode }).component;
      render(<C />);
      expect(screen.queryByText("more") !== null).toBe(shown);
    } finally {
      m.more = false;
      m.failed = false;
    }
  },
);
