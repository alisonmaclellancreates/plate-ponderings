import { expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

let search: { jurisdiction?: string; text?: string } = {};
vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: () => ({ data: { today: "2026-10-17", pick: null, recent: [] } }),
  queryOptions: (o: unknown) => o,
  infiniteQueryOptions: (o: unknown) => o,
}));
vi.mock("@/lib/featured.functions", () => ({
  getFeaturedHome: vi.fn(),
  getFeaturedArchive: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => ({ ...o, useSearch: () => search }),
}));
vi.mock("@/components/site/Homepage", () => ({
  Homepage: ({ variant, prefill }: { variant?: string; prefill?: { text?: string } }) => (
    <p>
      {variant ?? "default"}
      {prefill?.text ?? ""}
    </p>
  ),
}));

type R = {
  validateSearch: (s: Record<string, unknown>) => Record<string, string | undefined>;
  head: () => { meta: Record<string, string>[] };
  component: () => ReactNode;
  loader: (args: unknown) => unknown;
};

it("renders the default variant with matching titles", async () => {
  const r = (await import("@/routes/index")).Route as unknown as R;
  const C = r.component;
  expect(render(<C />).container.textContent).toBe("default");
  const meta = r.head().meta;
  const title = meta.find((m) => "title" in m)?.["title"];
  expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(title);
});

it("loads the matching homepage query", async () => {
  const r = (await import("@/routes/index")).Route as unknown as R;
  const ensureQueryData = vi.fn().mockResolvedValue("home");
  expect(await r.loader({ context: { queryClient: { ensureQueryData } } })).toBe("home");
  expect(ensureQueryData).toHaveBeenCalledWith(
    expect.objectContaining({ queryKey: ["featured-home"] }),
  );
});

it("passes validated search values into the homepage search", async () => {
  const r = (await import("@/routes/index")).Route as unknown as R;
  expect(r.validateSearch({ jurisdiction: "Utah", text: "TRAILS", x: 1 })).toEqual({
    jurisdiction: "Utah",
    text: "TRAILS",
  });
  expect(r.validateSearch({ jurisdiction: 5, text: "x".repeat(65) })).toEqual({
    jurisdiction: undefined,
    text: undefined,
  });
  search = { jurisdiction: "Utah", text: "TRAILS" };
  const C = r.component;
  expect(render(<C />).container.textContent).toBe("defaultTRAILS");
});
