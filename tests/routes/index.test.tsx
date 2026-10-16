import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
}));

import { Route } from "@/routes/index";

const R = Route as unknown as {
  head: () => { meta: Record<string, string>[] };
  component: () => ReactNode;
};

describe("index route", () => {
  it("renders the app name as the page heading inside main", () => {
    const C = R.component;
    render(<C />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(screen.getByRole("main")).toContainElement(heading);
    expect(heading.textContent).toBeTruthy();
  });

  it("head provides a title and matching og:title", () => {
    const meta = R.head().meta;
    const title = meta.find((m) => "title" in m)?.["title"];
    expect(title).toBeTruthy();
    expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(title);
  });
});
