import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const demo = vi.hoisted(() => ({
  begin: vi.fn(),
  setSession: vi.fn(),
  refresh: vi.fn(),
  navigate: vi.fn(),
  track: vi.fn(),
}));
vi.mock("@/lib/demo-login.functions", () => ({ startDemo: demo.begin }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { setSession: demo.setSession } },
}));
vi.mock("@/lib/analytics", () => ({ track: demo.track }));
vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => "/",
  useNavigate: () => demo.navigate,
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
vi.mock("@/lib/account-auth", () => ({ useAccountAuth: () => ({ refresh: demo.refresh }) }));

import { DemoPage, SignInPage, SignUpPage } from "@/components/site/Entry";

beforeEach(() => {
  vi.resetAllMocks();
  demo.begin.mockResolvedValue({
    access_token: "fixture-access",
    refresh_token: "fixture-refresh",
  });
  demo.setSession.mockResolvedValue({ error: null });
});

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
    const form = pw.closest("form");
    if (!form) throw new Error("Sign-in form missing");
    fireEvent.submit(form);
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
    const form = screen.getByLabelText("Email").closest("form");
    if (!form) throw new Error("Sign-up form missing");
    fireEvent.submit(form);
    expect(screen.queryByLabelText(/handle/i)).toBeNull();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  });

  it("demo lists what you'll see and starts the demo", () => {
    render(<DemoPage />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Start the Demo" })).toBeEnabled();
  });

  it("starts the demo, installs the session and leaves the entry screen for home", async () => {
    let finish: ((value: { access_token: string; refresh_token: string }) => void) | undefined;
    demo.begin.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<DemoPage />);
    fireEvent.click(screen.getByRole("button", { name: "Start the Demo" }));
    expect(screen.getByRole("button", { name: "Starting the Demo…" })).toBeDisabled();
    finish?.({ access_token: "fixture-access", refresh_token: "fixture-refresh" });
    await waitFor(() => expect(demo.navigate).toHaveBeenCalledWith({ to: "/" }));
    expect(screen.getByRole("button", { name: "Start the Demo" })).toBeEnabled();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(demo.setSession).toHaveBeenCalledWith({
      access_token: "fixture-access",
      refresh_token: "fixture-refresh",
    });
    expect(demo.refresh).toHaveBeenCalledOnce();
    expect(demo.track).toHaveBeenCalledWith("demo_started", {});
    expect(demo.navigate).toHaveBeenCalledWith({ to: "/" });
  });

  it.each(["mode off", "server refusal", "network failure", "session refusal"])(
    "shows a retryable visible result for %s",
    async (failure) => {
      if (failure === "session refusal")
        demo.setSession.mockResolvedValue({ error: new Error("Session rejected") });
      else
        demo.begin.mockRejectedValue(
          failure === "network failure" ? new TypeError("Failed to fetch") : new Error(failure),
        );
      render(<DemoPage />);
      fireEvent.click(screen.getByRole("button", { name: "Start the Demo" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "The demo is not available right now. Please try again soon.",
      );
      expect(screen.getByRole("button", { name: "Start the Demo" })).toBeEnabled();
      expect(demo.refresh).not.toHaveBeenCalled();
      expect(demo.track).not.toHaveBeenCalled();
      expect(demo.navigate).not.toHaveBeenCalled();
      if (failure !== "session refusal") expect(demo.setSession).not.toHaveBeenCalled();
    },
  );
});
