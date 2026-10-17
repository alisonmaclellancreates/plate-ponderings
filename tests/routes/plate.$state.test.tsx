import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

let loaderData: { state: string } = { state: "owner" };
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => ({
    ...o,
    useLoaderData: () => loaderData,
    useSearch: () => ({}),
  }),
  notFound: () => new Error("not found"),
}));

vi.mock("@/lib/plates.functions", () => ({ getPlate: vi.fn(async () => ({ plate: null })) }));

import { Route } from "@/routes/plate.$state";

type Meta = Record<string, string>[];
const R = Route as unknown as {
  loader: (a: { params: { state: string } }) => Promise<{ state: string }>;
  head: (a: { loaderData?: { state: string } }) => { meta: Meta };
  component: () => ReactNode;
};

describe("plate detail route", () => {
  it("loads known states and rejects unknown ones", async () => {
    expect(await R.loader({ params: { state: "mystery" } })).toEqual({ state: "mystery", plate: null });
    await expect(R.loader({ params: { state: "nope" } })).rejects.toThrow("not found");
    await expect(R.loader({ params: { state: "toString" } })).rejects.toThrow("not found");
    await expect(R.loader({ params: { state: "constructor" } })).rejects.toThrow("not found");
  });

  it("accepts any mock plate slug, as the Explore cards link", async () => {
    expect(await R.loader({ params: { state: "ut-canyons" } })).toEqual({ state: "ut-canyons", plate: null });
    await expect(R.loader({ params: { state: "not-a-plate" } })).rejects.toThrow("not found");
  });

  it("head for a slug-only plate labels it as plate stories", () => {
    const meta = R.head({ loaderData: { state: "ut-canyons" } }).meta;
    expect(meta.find((m) => "title" in m)?.["title"]).toBe(
      "CANYONS (Utah) · Plate stories | What the Plate?",
    );
  });

  it("head with an unknown state falls back to noindex", () => {
    const meta = R.head({ loaderData: { state: "nope" } }).meta;
    expect(meta.find((m) => "title" in m)?.["title"]).toBe("Plate unavailable | What the Plate?");
    expect(meta.find((m) => m["name"] === "robots")?.["content"]).toBe("noindex");
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
