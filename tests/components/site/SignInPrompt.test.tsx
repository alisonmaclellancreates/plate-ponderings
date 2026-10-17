import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const ID = "c10edcdd-6349-4041-a9b9-2bd648e86a14";
const m = vi.hoisted(() => ({
  getPlate: vi.fn(),
  query: { data: undefined as unknown, isPending: false },
  enabled: [] as boolean[],
  account: null as unknown,
}));

const href = (
  to: string,
  params?: Record<string, string>,
  search?: Record<string, string>,
  hash?: string,
) => {
  const path = params ? to.replace(/\$(\w+)/, (_, k: string) => params[k] ?? "") : to;
  const qs = search && Object.keys(search).length ? `?${new URLSearchParams(search)}` : "";
  return path + qs + (hash ? `#${hash}` : "");
};


vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Navigate: (p: {
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
  }) => <p data-testid="redirect">{href(p.to, p.params, p.search)}</p>,
  Link: ({
    to,
    params,
    search,
    children,
    className,
    ...rest
  }: {
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
    children: ReactNode;
    className?: string;
  }) => (
    <a className={className} href={href(to, params, search)} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
  createServerFn: () => {
    const b = { middleware: () => b, inputValidator: () => b, handler: (fn: unknown) => fn };
    return b;
  },
  createMiddleware: () => ({ server: () => ({}) }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryFn, enabled }: { queryFn: () => unknown; enabled: boolean }) => {
    m.enabled.push(enabled);
    if (enabled) queryFn();
    return m.query;
  },
}));
vi.mock("@/lib/plates.functions", () => ({ getPlate: m.getPlate }));
vi.mock("@/lib/account-auth", () => ({
  useAccountAuth: () => (m.account ? { account: m.account } : null),
}));

import { SignInPromptPage } from "@/components/site/Entry";

const plate = { id: ID, jurisdiction: "Newfoundland and Labrador", text: "ROW43XA" };

beforeEach(() => {
  vi.clearAllMocks();
  m.enabled = [];
  m.account = null;
  m.query = { data: { plate }, isPending: false };
});

function expectFallback() {
  expect(screen.getByText("We couldn't find that plate.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Spot a Plate" })).toHaveAttribute("href", "/spot");
  expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute("href", "/explore");
  expect(screen.queryByTestId("plate-header")).toBeNull();
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.queryByRole("link", { name: "Sign In" })).toBeNull();
}

describe("sign-in prompt", () => {
  it("shows the plate the visitor came from, with choices that return to its story form", () => {
    render(<SignInPromptPage plateId={ID} />);
    expect(m.getPlate).toHaveBeenCalledWith({ data: { id: ID } });
    expect(
      screen.getByRole("img", { name: "Newfoundland and Labrador plate ROW43XA" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Add Your Story");
    expect(screen.getByText("Sign in to add your story")).toBeInTheDocument();
    const ret = `returnTo=${encodeURIComponent(`/story/1?plate=${ID}`)}`;
    const signIn = screen.getByRole("link", { name: "Sign In" });
    expect(signIn).toHaveAttribute("href", `/sign-in?${ret}`);
    expect(signIn).toHaveAccessibleDescription("I already have an account");
    expect(screen.getByRole("link", { name: "Create an Account" })).toHaveAttribute(
      "href",
      `/sign-up?${ret}`,
    );
    expect(screen.getByRole("link", { name: "Try the Demo" })).toHaveAttribute("href", "/demo");
    expect(screen.getByRole("link", { name: "Back to this plate" })).toHaveAttribute(
      "href",
      `/plate/${ID}`,
    );
  });

  it("shows the fallback without looking anything up when there is no plate id", () => {
    render(<SignInPromptPage />);
    expect(m.enabled).toEqual([false]);
    expect(m.getPlate).not.toHaveBeenCalled();
    expectFallback();
  });

  it("shows the fallback for a malformed id without looking it up", () => {
    render(<SignInPromptPage plateId="//evil.example/x" />);
    expect(m.getPlate).not.toHaveBeenCalled();
    expectFallback();
  });

  it("shows the fallback when the plate is missing or unpublished", () => {
    m.query = { data: { plate: null }, isPending: false };
    render(<SignInPromptPage plateId={ID} />);
    expectFallback();
  });

  it("shows no plate while the lookup is running", () => {
    m.query = { data: undefined, isPending: true };
    const { container } = render(<SignInPromptPage plateId={ID} />);
    expect(container.textContent).toBe("");
  });

  it("sends a signed-in visitor straight to the story form for that plate", () => {
    m.account = { handle: "Traveler1", isDemo: false, isAdmin: false };
    render(<SignInPromptPage plateId={ID} />);
    expect(screen.getByTestId("redirect")).toHaveTextContent(`/story/1?plate=${ID}`);
  });

  it("does not redirect a signed-in visitor when the plate is not found", () => {
    m.account = { handle: "Traveler1", isDemo: false, isAdmin: false };
    m.query = { data: { plate: null }, isPending: false };
    render(<SignInPromptPage plateId={ID} />);
    expect(screen.queryByTestId("redirect")).toBeNull();
    expectFallback();
  });
});
