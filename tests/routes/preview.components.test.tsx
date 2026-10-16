import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
}));

import { Route } from "@/routes/preview.components";

const R = Route as unknown as {
  head: () => { meta: Record<string, string>[] };
  component: () => ReactNode;
};

describe("components preview route", () => {
  it("shows plates in three sizes and badges", () => {
    const C = R.component;
    render(<C />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    const sizes = screen.getAllByRole("img").map((el) => el.getAttribute("data-size"));
    expect(new Set(sizes)).toEqual(new Set(["sm", "md", "lg"]));
    expect(screen.getByText("Mixed views")).toBeInTheDocument();
  });

  it("head has a title matching og:title", () => {
    const meta = R.head().meta;
    const title = meta.find((m) => "title" in m)?.["title"];
    expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(title);
  });
});
