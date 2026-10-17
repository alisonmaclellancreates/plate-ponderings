import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => ({
    ...o,
    useLoaderData: () => ({ step: "done" }),
    useSearch: () => ({}),
  }),
  notFound: () => new Error("not found"),
}));
vi.mock("@/components/site/AddStory", async (orig) => ({
  ...(await orig<typeof import("@/components/site/AddStory")>()),
  StoryStepPage: ({ step }: { step: string }) => <p>{step}</p>,
}));

import { Route } from "@/routes/_authenticated/story.$step";

const R = Route as unknown as {
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
    expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(title);
    expect(R.head({}).meta.find((m) => m["name"] === "robots")?.["content"]).toBe("noindex");
  });

  it("renders the step from loader data", () => {
    const C = R.component;
    expect(render(<C />).container.textContent).toBe("done");
  });
});
