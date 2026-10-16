import { expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => o,
}));
vi.mock("@/components/site/SpotPlate", () => ({ SpotPage: () => <p>spot form</p> }));

import { Route } from "@/routes/spot.index";

const R = Route as unknown as {
  head: () => { meta: Record<string, string>[] };
  component: () => ReactNode;
};

it("renders the Spot a Plate form with matching titles", () => {
  const C = R.component;
  expect(render(<C />).container.textContent).toBe("spot form");
  const meta = R.head().meta;
  const title = meta.find((m) => "title" in m)?.["title"];
  expect(title).toContain("Spot a Plate");
  expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(title);
});
