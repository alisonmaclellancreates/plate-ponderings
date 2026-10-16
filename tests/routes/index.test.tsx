import { expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => o,
}));
vi.mock("@/components/site/Homepage", () => ({
  Homepage: ({ variant }: { variant?: string }) => <p>{variant ?? "default"}</p>,
}));

type R = { head: () => { meta: Record<string, string>[] }; component: () => ReactNode };

it("renders the default variant with matching titles", async () => {
  const r = (await import("@/routes/index")).Route as unknown as R;
  const C = r.component;
  expect(render(<C />).container.textContent).toBe("default");
  const meta = r.head().meta;
  const title = meta.find((m) => "title" in m)?.["title"];
  expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(title);
});
