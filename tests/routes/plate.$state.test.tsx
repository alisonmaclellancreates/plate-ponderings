import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

let loaderData: { state: string } = { state: "owner" };
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => ({
    ...o,
    useLoaderData: () => loaderData,
  }),
  notFound: () => new Error("not found"),
}));

import { Route } from "@/routes/plate.$state";

type Meta = Record<string, string>[];
const R = Route as unknown as {
  loader: (a: { params: { state: string } }) => { state: string };
  head: (a: { loaderData?: { state: string } }) => { meta: Meta };
  component: () => ReactNode;
};

describe("plate detail route", () => {
  it("loads known states and rejects unknown ones", () => {
    expect(R.loader({ params: { state: "mystery" } })).toEqual({ state: "mystery" });
    expect(() => R.loader({ params: { state: "nope" } })).toThrow("not found");
  });

  it("head has unique titles per state and noindex fallback", () => {
    const meta = R.head({ loaderData: { state: "owner" } }).meta;
    const title = meta.find((m) => "title" in m)?.["title"];
    expect(title).toContain("TEATIME");
    expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(title);
    expect(R.head({}).meta.find((m) => m["name"] === "robots")?.["content"]).toBe("noindex");
  });

  it("renders the state from loader data", () => {
    loaderData = { state: "mystery" };
    const C = R.component;
    render(<C />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Washington plate B7K2L9");
  });
});
