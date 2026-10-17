import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

let outletContent: ReactNode = null;

const { invalidate, reportLovableError, track, location } = vi.hoisted(() => ({
  invalidate: vi.fn(),
  reportLovableError: vi.fn(),
  track: vi.fn(),
  location: { pathname: "/" },
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
  useRouterState: () => location.pathname,
}));
vi.mock("@/lib/lovable-error-reporting", () => ({ reportLovableError }));
vi.mock("@/lib/analytics", () => ({ track }));
vi.mock("@/lib/auth-context", () => ({
  AccountProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/lib/account-auth", () => ({ useAccountAuth: () => null }));

function OutletProbe() {
  const client = useQueryClient();
  return (
    <div data-testid="outlet">
      {client ? "has-client" : "none"}
      {outletContent}
    </div>
  );
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
    track.mockClear();
    location.pathname = "/";
    outletContent = null;
  });

  it("head sets a title, viewport meta and the stylesheet link", () => {
    const head = R.head();
    expect(head.meta.some((m) => typeof m["title"] === "string" && m["title"].length > 0)).toBe(
      true,
    );
    expect(head.meta.find((m) => m["name"] === "viewport")).toBeDefined();
    const sheet = head.links.find((l) => l["rel"] === "stylesheet");
    expect(sheet).toHaveProperty("href");
  });

  it("not-found renders the Sasquatch page with a link back to Explore", () => {
    render(<>{R.notFoundComponent()}</>);
    expect(
      screen.getByRole("heading", { level: 1, name: "This road doesn't go anywhere." }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("sasquatch")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Explore" })).toHaveAttribute(
      "href",
      "/explore",
    );
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

  it("tracks initial and changed routes without tracking unchanged rerenders", () => {
    R.useRouteContext = () => ({ queryClient: new QueryClient() });
    try {
      const C = R.component;
      const { rerender } = render(<C />);
      expect(track).toHaveBeenCalledWith("$pageview", { path: "/" });
      rerender(<C />);
      expect(track).toHaveBeenCalledTimes(1);
      location.pathname = "/explore";
      rerender(<C />);
      expect(track).toHaveBeenLastCalledWith("$pageview", { path: "/explore" });
      expect(track).toHaveBeenCalledTimes(2);
    } finally {
      delete R.useRouteContext;
    }
  });

  it.each([null, "0"])(
    "focuses the navigated page heading, preserving existing tabindex %s",
    (tabindex) => {
      const queryClient = new QueryClient();
      R.useRouteContext = () => ({ queryClient });
      outletContent = (
        <main>
          <h1 {...(tabindex === null ? {} : { tabIndex: Number(tabindex) })}>Page heading</h1>
        </main>
      );
      try {
        const C = R.component;
        const view = render(<C />);
        const heading = screen.getByRole("heading", { name: "Page heading" });
        const focus = vi.spyOn(heading, "focus");
        expect(heading).not.toHaveFocus();
        if (tabindex === null) expect(heading).not.toHaveAttribute("tabindex");
        location.pathname = "/explore";
        view.rerender(<C />);
        expect(focus).toHaveBeenCalledTimes(1);
        expect(heading).toHaveFocus();
        expect(heading).toHaveAttribute("tabindex", tabindex ?? "-1");
        view.rerender(<C />);
        expect(focus).toHaveBeenCalledTimes(1);
      } finally {
        delete R.useRouteContext;
      }
    },
  );

  it("does not move focus on first load or when the new page has no main h1", () => {
    const queryClient = new QueryClient();
    R.useRouteContext = () => ({ queryClient });
    outletContent = (
      <>
        <h1 tabIndex={0}>Outside main</h1>
        <main>
          <button>Keep focus</button>
        </main>
      </>
    );
    try {
      const focus = vi.spyOn(HTMLElement.prototype, "focus");
      const C = R.component;
      const view = render(<C />);
      expect(focus).not.toHaveBeenCalled();
      const button = screen.getByRole("button", { name: "Keep focus" });
      button.focus();
      focus.mockClear();
      location.pathname = "/explore";
      view.rerender(<C />);
      expect(focus).not.toHaveBeenCalled();
      expect(button).toHaveFocus();
    } finally {
      delete R.useRouteContext;
    }
  });
});
