import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
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
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn, createServerFn: () => { const b = { middleware: () => b, inputValidator: () => b, handler: (fn: unknown) => fn }; return b; }, createMiddleware: () => ({ server: () => ({}) }) }));
vi.mock("@/lib/auth-context", () => ({ useAccountAuth: () => null }));

import { DemoPage, SignInPage, SignInPromptPage, SignUpPage } from "@/components/site/Entry";
import { StoryStepOne } from "@/components/site/AddStory";
import { SiteHeader } from "@/components/site/SiteHeader";

describe("entry screens", () => {
  it("sign-in prompt offers three choices with captions and a way back", () => {
    render(<SignInPromptPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Add Your Story");
    expect(screen.getByRole("img", { name: "Oregon plate PNW LV" })).toBeInTheDocument();
    expect(screen.getByText("Sign in to add your story")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Choose how you'd like to continue. After signing in, you'll return here to add your story.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Your story will be added/)).toBeNull();
    const signIn = screen.getByRole("link", { name: "Sign In" });
    expect(signIn).toHaveAttribute("href", "/sign-in");
    expect(signIn).toHaveAccessibleDescription("I already have an account");
    expect(screen.getByRole("link", { name: "Create an Account" })).toHaveAccessibleDescription(
      "I'm new here",
    );
    expect(screen.getByRole("link", { name: "Try the Demo" })).toHaveAccessibleDescription(
      "Look around as a sample traveler",
    );
    expect(screen.getByRole("link", { name: "Back to this plate" })).toHaveAttribute(
      "href",
      "/plate/pnw-lv",
    );
  });

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
    expect(screen.getByRole("link", { name: "Start the Demo" })).toHaveAttribute(
      "href",
      "/demo-form",
    );
  });

  it("demo form shows the banner and disables every control", () => {
    render(<StoryStepOne demo />);
    expect(screen.getByTestId("demo-banner")).toHaveTextContent(/turned off/);
    for (const r of screen.getAllByRole("radio")) expect(r).toBeDisabled();
    const meaning = screen.getByLabelText(/What do you think it means/);
    expect(meaning).toBeDisabled();
    expect(meaning).toHaveAttribute("placeholder", "Adding stories is turned off in the demo.");
    expect(screen.getByLabelText(/Tell us more/)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});

describe("header modes", () => {
  it("signed out shows Sign in, Try the Demo, and moves the demo into the mobile menu", () => {
    render(<SiteHeader mode="signed-out" />);
    expect(screen.getAllByRole("link", { name: "Sign in" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Try the Demo" })).toHaveLength(1);
    expect(screen.queryByText("Traveler4821")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const mobile = screen.getByRole("navigation", { name: "Mobile" });
    expect(within(mobile).getByRole("link", { name: "Try the Demo" })).toHaveAttribute(
      "href",
      "/demo",
    );
  });

  it("demo shows Traveler4821 with the profile menu open, including Exit Demo", () => {
    render(<SiteHeader mode="demo" />);
    expect(screen.getAllByText("Traveler4821").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Exit Demo" }).length).toBeGreaterThan(0);
    const toggle = screen.getByRole("button", { expanded: true, name: "Traveler4821" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
