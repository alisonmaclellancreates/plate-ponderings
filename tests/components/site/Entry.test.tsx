import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => "/",
  useNavigate: () => vi.fn(),
  Link: ({
    to,
    params,
    children,
    className,
    ...rest
  }: {
    to: string;
    params?: Record<string, string>;
    children: ReactNode;
    className?: string;
  }) => (
    <a
      className={className}
      href={params ? to.replace(/\$(\w+)/, (_, k: string) => params[k] ?? "") : to}
      {...rest}
    >
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
vi.mock("@/lib/account-auth", () => ({ useAccountAuth: () => null }));

import { DemoPage, SignInPage, SignUpPage } from "@/components/site/Entry";

describe("entry screens", () => {
  it("sign in toggles password visibility and has no extras", () => {
    render(<SignInPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sign In");
    const pw = screen.getByLabelText("Password");
    expect(pw).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(pw).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(pw).toHaveAttribute("type", "password");
    fireEvent.submit(pw.closest("form")!);
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
    expect(screen.queryByText(/Remember me|Forgot/)).toBeNull();
  });

  it("sign up has the password hint and no handle field", () => {
    render(<SignUpPage />);
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
      "Use at least 8 characters",
    );
    expect(screen.getByRole("button", { name: "Create Account" })).toHaveClass("brand-btn-coral");
    fireEvent.submit(screen.getByLabelText("Email").closest("form")!);
    expect(screen.queryByLabelText(/handle/i)).toBeNull();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  });

  it("demo lists what you'll see and starts the demo", () => {
    render(<DemoPage />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Start the Demo" })).toBeEnabled();
  });

