import { expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => o,
}));
vi.mock("@/components/site/Explore", () => ({ Explore: () => <p>archive</p> }));
vi.mock("@tanstack/react-query", () => ({ useSuspenseInfiniteQuery: () => ({ data: { pages: [{ today: "2026-10-17", plates: [] }] }, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn() }), queryOptions: (o: unknown) => o, infiniteQueryOptions: (o: unknown) => o }));
vi.mock("@/lib/featured.functions", () => ({ getFeaturedHome: vi.fn(), getFeaturedArchive: vi.fn() }));
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

it("loads the matching infinite archive query", async () => {
  const r = Route as unknown as { loader: (args: unknown) => unknown };
  const ensureInfiniteQueryData = vi.fn().mockResolvedValue("archive");
  expect(await r.loader({ context: { queryClient: { ensureInfiniteQueryData } } })).toBe("archive");
  expect(ensureInfiniteQueryData).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["featured-archive"] }));
});
