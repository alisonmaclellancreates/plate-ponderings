import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { invalidate, reportLovableError } = vi.hoisted(() => ({
  invalidate: vi.fn(),
  reportLovableError: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createRootRouteWithContext: () => (options: Record<string, unknown>) => options,
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  Outlet: () => <OutletProbe />,
  HeadContent: () => <meta data-testid="head-content" />,
  Scripts: () => <span data-testid="scripts" />,
  useRouter: () => ({ invalidate }),
}));
vi.mock("@/lib/lovable-error-reporting", () => ({ reportLovableError }));
vi.mock("../src/styles.css?url", () => ({ default: "/styles.css" }));

function OutletProbe() {
  const client = useQueryClient();
  return <div data-testid="outlet">{client ? "has-client" : "none"}</div>;
}

import { Route } from "@/routes/__root";

type Opts = {
  head: () => { meta: Record<string, string>[]; links: Record<string, string>[] };
  component: () => ReactNode;
  notFoundComponent: () => ReactNode;
  errorComponent: (p: { error: Error; reset: () => void }) => ReactNode;
  shellComponent: (p: { children: ReactNode }) => ReactNode;
  useRouteContext?: () => { queryClient: QueryClient };
};
const R = Route as unknown as Opts;

describe("root route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    invalidate.mockClear();
    reportLovableError.mockClear();
  });

  it("head sets a title, viewport meta and the stylesheet link", () => {
    const head = R.head();
    expect(head.meta.some((m) => typeof m["title"] === "string" && m["title"].length > 0)).toBe(
      true,
    );
    expect(head.meta.find((m) => m["name"] === "viewport")).toBeDefined();
    const sheet = head.links.find((l) => l["rel"] === "stylesheet");
    expect(sheet?.["href"]).toBeTruthy();
  });

  it("not-found renders a heading and a link home", () => {
    render(<>{R.notFoundComponent()}</>);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/");
  });

  it("error component reports, logs, and retries", () => {
    const error = new Error("boom");
    const reset = vi.fn();
    const original = console.error;
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      if (args[0] !== error) original(...args);
    });
    const Err = R.errorComponent;
    render(<Err error={error} reset={reset} />);
    expect(spy).toHaveBeenCalledWith(error);
    expect(reportLovableError).toHaveBeenCalledWith(error, {
      boundary: "tanstack_root_error_component",
    });
    expect(screen.getByRole("heading")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("root component provides the context query client to the outlet", () => {
    const queryClient = new QueryClient();
    R.useRouteContext = () => ({ queryClient });
    try {
      const C = R.component;
      render(<C />);
      expect(screen.getByTestId("outlet")).toHaveTextContent("has-client");
    } finally {
      delete R.useRouteContext;
    }
  });

  it("shell component renders its children with head content and scripts", () => {
    const original = console.error;
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      if (!String(args[0]).includes("cannot be a child of")) original(...args);
    });
    const Shell = R.shellComponent;
    render(
      <Shell>
        <p>child content</p>
      </Shell>,
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
    expect(screen.getByTestId("scripts")).toBeInTheDocument();
  });
});
