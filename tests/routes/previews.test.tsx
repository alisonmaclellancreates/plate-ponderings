import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
  Link: ({
    to,
    params,
    children,
  }: {
    to: string;
    params?: Record<string, string>;
    children: ReactNode;
  }) => (
    <a href={params ? to.replace(/\$(\w+)/, (_, k: string) => params[k] ?? "") : to}>{children}</a>
  ),
}));

import { Route } from "@/routes/previews";

const R = Route as unknown as {
  head: () => { meta: Record<string, string>[] };
  component: () => ReactNode;
};

describe("previews route", () => {
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

describe("previews plate links", () => {
  it("links the featured sample pages and identifies home and archive as live", () => {
    const C = R.component;
    render(<C />);
    const links = screen.getAllByRole("link");
    expect(links.find((link) => link.getAttribute("href") === "/")?.textContent).toContain(
      "Live data:",
    );
    expect(links.find((link) => link.getAttribute("href") === "/explore")?.textContent).toContain(
      "Live data:",
    );
    expect(links.map((link) => link.getAttribute("href"))).toContain("/previews/explore");
    expect(links.map((link) => link.getAttribute("href"))).toContain("/previews/homepage-featured");
  });
  it("links every plate detail state", () => {
    const C = R.component;
    render(<C />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    for (const s of [
      "mystery",
      "interpreted",
      "owner",
      "interpreted-history",
      "pending-story",
      "catching-up",
    ]) {
      expect(hrefs).toContain(`/plate/${s}`);
    }
  });
});
