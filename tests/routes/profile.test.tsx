import { expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => o,
}));
vi.mock("@/components/site/Account", () => ({ ProfilePage: () => <p>page</p> }));

import { Route } from "@/routes/_authenticated/profile";

const R = Route as unknown as {
  head: () => { meta: Record<string, string>[] };
  component: () => ReactNode;
};

it("renders the page with matching titles", () => {
  const C = R.component;
  expect(render(<C />).container.textContent).toBe("page");
  const meta = R.head().meta;
  const title = meta.find((m) => "title" in m)?.["title"];
  expect(title).toContain("Your Profile");
  expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(title);
});
