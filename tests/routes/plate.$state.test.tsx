import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

type PlateData = { id: string; jurisdiction: string; text: string };
let loaderData: { state: string; plate?: PlateData | null } = { state: "owner" };
let search: { jurisdiction?: string; text?: string } = {};
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => ({
    ...o,
    useLoaderData: () => loaderData,
    useSearch: () => search,
  }),
  notFound: () => new Error("not found"),
}));

vi.mock("@/lib/plates.functions", () => ({ getPlate: vi.fn(async () => ({ plate: null })) }));

import { Route } from "@/routes/plate.$state";
import { getPlate } from "@/lib/plates.functions";

type Meta = Record<string, string>[];
const R = Route as unknown as {
  loader: (a: { params: { state: string } }) => Promise<{ state: string; plate: PlateData | null }>;
  head: (a: { loaderData?: { state: string; plate?: PlateData | null } }) => { meta: Meta };
  validateSearch: (s: Record<string, unknown>) => { jurisdiction?: string; text?: string };
  component: () => ReactNode;
};

describe("plate detail route", () => {
  beforeEach(() => {
    search = {};
    vi.mocked(getPlate).mockResolvedValue({ plate: null });
  });
  it("loads a real plate by id and uses its data rather than a preview alias", async () => {
    const plate = { id: "real-plate", jurisdiction: "Utah", text: "DRAGON" };
    vi.mocked(getPlate).mockResolvedValue({ plate });
    expect(await R.loader({ params: { state: "real-plate" } })).toEqual({ state: "real-plate", plate });
    expect(getPlate).toHaveBeenCalledWith({ data: { id: "real-plate" } });
  });
  it("builds a real plate's share metadata from the returned safe fields", () => {
    const meta = R.head({ loaderData: { state: "real-plate", plate: { id: "real-plate", jurisdiction: "Utah", text: "DRAGON" } } }).meta;
    const title = "DRAGON (Utah) | What the Plate?";
    const description = "Stories about the Utah plate DRAGON, and what people think it means.";
    expect(meta).toEqual([
      { title }, { name: "description", content: description },
      { property: "og:title", content: title }, { property: "og:description", content: description },
      { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" },
    ]);
  });
  it.each([
    [{ jurisdiction: "Utah", text: "DRAGON" }, { jurisdiction: "Utah", text: "DRAGON" }],
    [{ jurisdiction: 42, text: null }, { jurisdiction: undefined, text: undefined }],
    [{ jurisdiction: "a".repeat(65), text: "a".repeat(65) }, { jurisdiction: undefined, text: undefined }],
    [{ jurisdiction: "a".repeat(64), text: "a".repeat(64) }, { jurisdiction: "a".repeat(64), text: "a".repeat(64) }],
  ])("validates search return values %j", (input, expected) => {
    expect(R.validateSearch(input)).toEqual(expected);
  });
  it.each([{}, { jurisdiction: "Utah" }, { jurisdiction: "Utah", text: "DRAGON" }])("renders the real plate with return search %j", (values) => {
    loaderData = { state: "real-plate", plate: { id: "real-plate", jurisdiction: "Utah", text: "DRAGON" } };
    search = values;
    const C = R.component;
    render(<C />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Utah plate DRAGON");
    const back = screen.queryByRole("link", { name: "Back to Search" });
    if ("text" in values) expect(back).toBeInTheDocument();
    else expect(back).not.toBeInTheDocument();
  });
  it("loads known states and rejects unknown ones", async () => {
    expect(await R.loader({ params: { state: "mystery" } })).toEqual({
      state: "mystery",
      plate: null,
    });
    await expect(R.loader({ params: { state: "nope" } })).rejects.toThrow("not found");
    await expect(R.loader({ params: { state: "toString" } })).rejects.toThrow("not found");
    await expect(R.loader({ params: { state: "constructor" } })).rejects.toThrow("not found");
  });

  it("accepts any mock plate slug, as the Explore cards link", async () => {
    expect(await R.loader({ params: { state: "ut-canyons" } })).toEqual({
      state: "ut-canyons",
      plate: null,
    });
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
