import { expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => ({ ...o, useSearch: () => ({ returnTo: "/" }) }),
}));
vi.mock("@/components/site/Entry", () => ({
  SignInPage: () => <p>signin</p>,
}));

import { Route } from "@/routes/sign-in";

type R = { head: () => { meta: Record<string, string>[] }; component: () => ReactNode };

it("renders with matching titles", () => {
  const r = Route as unknown as R;
  const C = r.component;
  expect(render(<C />).container.textContent).toBe("signin");
  const meta = r.head().meta;
  const t = meta.find((m) => "title" in m)?.["title"];
  expect(t).toContain("Sign In");
  expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(t);
});
