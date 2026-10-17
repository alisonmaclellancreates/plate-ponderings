import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

const search = vi.hoisted(() => ({ value: {} as { plate?: string } }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => ({
    ...o,
    useLoaderData: () => ({ step: "done" }),
    useSearch: () => search.value,
  }),
  notFound: () => new Error("not found"),
}));
vi.mock("@/components/site/AddStory", async (orig) => ({
  ...(await orig<typeof import("@/components/site/AddStory")>()),
  StoryStepPage: ({ step }: { step: string }) => <p>{step}</p>,
}));

vi.mock("@/components/site/AddStoryFlow", () => ({
  AddStoryFlow: ({ plateId }: { plateId: string }) => <p>flow:{plateId}</p>,
}));

import { Route } from "@/routes/_authenticated/story.$step";

const R = Route as unknown as {
  validateSearch: (s: Record<string, unknown>) => { plate?: string };
  loader: (a: { params: { step: string } }) => { step: string };
  head: (a: { loaderData?: { step: string } }) => { meta: Record<string, string>[] };
  component: () => ReactNode;
};

describe("story step route", () => {
  it("accepts known steps and rejects inherited names", () => {
    expect(R.loader({ params: { step: "2" } })).toEqual({ step: "2" });
    for (const bad of ["nope", "toString", "constructor"]) {
      expect(() => R.loader({ params: { step: bad } })).toThrow("not found");
    }
  });

  it("has a title per step and a noindex fallback", () => {
    const meta = R.head({ loaderData: { step: "3" } }).meta;
    const title = meta.find((m) => "title" in m)?.["title"];
    expect(title).toContain("Review and submit");
    const desc = meta.find((m) => m["name"] === "description")?.["content"];
    expect(desc).toBe(
      "Add your story to a plate. Step: review and submit.",
    );
    expect(desc).not.toContain("Oregon");
    expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(title);
    expect(R.head({}).meta.find((m) => m["name"] === "robots")?.["content"]).toBe("noindex");
  });

  it("renders the step from loader data", () => {
    const C = R.component;
    expect(render(<C />).container.textContent).toBe("done");
  });

  it("keeps only a well-formed plate id from the search", () => {
    const id = "123e4567-e89b-42d3-a456-426614174000";
    expect(R.validateSearch({ plate: id.toUpperCase() })).toEqual({ plate: id });
    expect(R.validateSearch({ plate: "p1" })).toEqual({});
    expect(R.validateSearch({ plate: `${id}0` })).toEqual({});
    expect(R.validateSearch({ plate: id + "x".repeat(500) })).toEqual({});
    expect(R.validateSearch({ plate: "" })).toEqual({});
    expect(R.validateSearch({ plate: 7 })).toEqual({});
    expect(R.validateSearch({})).toEqual({});
  });

  it("renders the real flow for the plate in the search", () => {
    search.value = { plate: "p1" };
    const C = R.component;
    expect(render(<C />).container.textContent).toBe("flow:p1");
    search.value = {};
  });
});
