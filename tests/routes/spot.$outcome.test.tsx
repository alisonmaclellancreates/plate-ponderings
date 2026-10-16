import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => ({
    ...o,
    useLoaderData: () => ({ outcome: "rejected" }),
  }),
  notFound: () => new Error("not found"),
}));
vi.mock("@/components/site/SpotPlate", async (orig) => ({
  ...(await orig<typeof import("@/components/site/SpotPlate")>()),
  SpotOutcomePage: ({ outcome }: { outcome: string }) => <p>{outcome}</p>,
}));

import { Route } from "@/routes/spot.$outcome";

const R = Route as unknown as {
  loader: (a: { params: { outcome: string } }) => { outcome: string };
  head: (a: { loaderData?: { outcome: string } }) => { meta: Record<string, string>[] };
  component: () => ReactNode;
};

describe("spot outcome route", () => {
  it("accepts known outcomes and rejects inherited names", () => {
    expect(R.loader({ params: { outcome: "new" } })).toEqual({ outcome: "new" });
    for (const bad of ["nope", "toString", "constructor"]) {
      expect(() => R.loader({ params: { outcome: bad } })).toThrow("not found");
    }
  });

  it("has a title per outcome and a noindex fallback", () => {
    const meta = R.head({ loaderData: { outcome: "pending" } }).meta;
    const title = meta.find((m) => "title" in m)?.["title"];
    expect(title).toContain("Waiting for its check");
    expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(title);
    expect(R.head({}).meta.find((m) => m["name"] === "robots")?.["content"]).toBe("noindex");
  });

  it("renders the outcome from loader data", () => {
    const C = R.component;
    expect(render(<C />).container.textContent).toBe("rejected");
  });
});
