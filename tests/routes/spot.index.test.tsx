import { expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({ page: vi.fn(() => <p>spot form</p>) }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => ({ ...o, useSearch: () => ({ jurisdiction: "Utah", text: "DRAGON" }) }),
}));
vi.mock("@/components/site/SpotPlate", () => ({ SpotLivePage: mocks.page }));

import { Route } from "@/routes/_authenticated/spot.index";

const R = Route as unknown as {
  head: () => { meta: Record<string, string>[] };
  component: () => ReactNode;
  validateSearch: (s: Record<string, unknown>) => { jurisdiction?: string; text?: string };
};

it("renders the Spot a Plate form with matching titles", () => {
  const C = R.component;
  expect(render(<C />).container.textContent).toBe("spot form");
  expect(mocks.page).toHaveBeenCalledWith({ values: { jurisdiction: "Utah", text: "DRAGON" } }, undefined);
  const meta = R.head().meta;
  const title = meta.find((m) => "title" in m)?.["title"];
  expect(title).toContain("Spot a Plate");
  expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(title);
});

it.each([
  [{ jurisdiction: "Utah", text: "DRAGON" }, { jurisdiction: "Utah", text: "DRAGON" }],
  [{ jurisdiction: null, text: 42 }, { jurisdiction: undefined, text: undefined }],
  [{ jurisdiction: "a".repeat(65), text: "a".repeat(65) }, { jurisdiction: undefined, text: undefined }],
  [{ jurisdiction: "a".repeat(64), text: "a".repeat(64) }, { jurisdiction: "a".repeat(64), text: "a".repeat(64) }],
])("filters search prefill %j", (input, expected) => {
  expect(R.validateSearch(input)).toEqual(expected);
});
