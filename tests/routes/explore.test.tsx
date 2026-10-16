import { expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (o: Record<string, unknown>) => o }));
vi.mock("@/components/site/Explore", () => ({ Explore: () => <p>archive</p> }));
import { Route } from "@/routes/explore";
it("renders the archive with matching page and social metadata", () => {
  const r = Route as unknown as { component: () => ReactNode; head: () => { meta: Record<string, string>[] } };
  const C = r.component;
  expect(render(<C />).container.textContent).toBe("archive");
  const meta = r.head().meta;
  const title = meta.find((m) => "title" in m)?.["title"];
  expect(title).toBe("The Roadside Archive | What the Plate?");
  expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(title);
  expect(meta.find((m) => m["property"] === "og:description")?.["content"]).toBe(meta.find((m) => m["name"] === "description")?.["content"]);
});