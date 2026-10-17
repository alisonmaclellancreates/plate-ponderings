import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@/lib/account-auth", () => ({
  useAccountAuth: () => ({
    account: { handle: "Traveler1234", isDemo: false, isAdmin: false },
    refresh: vi.fn(),
    signOut: vi.fn(),
    completeSignIn: vi.fn(),
    demoEnabled: false,
  }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => m.navigate,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signUp: m.signUp, signInWithPassword: m.signIn } },
}));
import { HandleField } from "@/components/site/Account";
import { SignInPage, SignUpPage } from "@/components/site/Entry";
import { HandleCheckStatusPanel } from "@/components/site/HandleCheckStatus";
import { HANDLE_REJECTED, HANDLE_TAKEN } from "@/lib/account-rules";

beforeEach(() => vi.clearAllMocks());

it("handle field previews show each rule-based message and the available badge", () => {
  const v = render(<HandleField draft="Rowan_Design" available />);
  expect(screen.getByText("Available")).toBeInTheDocument();
  v.unmount();
  render(<HandleField draft="Traveler3374" message={HANDLE_TAKEN} />);
  expect(screen.getByText("That handle is taken. Choose another.")).toBeInTheDocument();
  v.rerender(<HandleField draft="admin" />);
  expect(screen.getByText("That handle is reserved. Choose another.")).toBeInTheDocument();
  v.rerender(<HandleField draft="rowan!" />);
  expect(screen.getByText("Use letters, numbers, and underscores only.")).toBeInTheDocument();
  v.rerender(<HandleField draft="ab" />);
  expect(screen.getByText("Use 3 to 20 characters.")).toBeInTheDocument();
  v.rerender(<HandleField draft="Rowan_Design" message={HANDLE_REJECTED} />);
  expect(
    screen.getByText("That handle couldn't be used. Your current handle is unchanged."),
  ).toBeInTheDocument();
  v.rerender(<HandleField draft="Rowan_Design" message="Changes saved." />);
  expect(screen.getByText("Changes saved.")).toBeInTheDocument();
});

it("handle field is full width with feedback on its own line at narrow widths", () => {
  render(<HandleField draft="admin" />);
  const layout = screen.getByLabelText("Handle").parentElement as HTMLElement;
  expect(layout.className).toContain("grid-cols-1");
  expect(layout.className).toContain("sm:grid-cols-[minmax(0,1fr)_auto]");
  expect(screen.getByLabelText("Handle").className).toContain("w-full");
});

it("handle field previews are inert without handlers", () => {
  render(<HandleField draft="Rowan_Design" />);
  const input = screen.getByLabelText("Handle");
  fireEvent.change(input, { target: { value: "Changed_Name" } });
  expect((input as HTMLInputElement).value).toBe("Rowan_Design");
  fireEvent.submit(input.closest("form") as HTMLFormElement);
  expect((input as HTMLInputElement).value).toBe("Rowan_Design");
});

it("status panel previews show Ready without Resume and the Blocked design", () => {
  const v = render(<HandleCheckStatusPanel status={{ allowed: true, category: null }} />);
  expect(screen.getByText("Ready")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Resume handle checks" })).toBeNull();
  v.unmount();
  render(
    <HandleCheckStatusPanel
      status={{ allowed: true, category: "credit_block", blockedAt: "2026-10-17T01:00:00.000Z" }}
    />,
  );
  expect(screen.getByTestId("blocked-icon")).toBeInTheDocument();
  expect(screen.getByText("Blocked")).toBeInTheDocument();
  expect(
    screen.getByText("Handle checks are paused. People can keep their current handles."),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Resume handle checks" }));
  expect(screen.queryByText("Handle checks resumed.")).toBeNull();
});

it("entry previews show the error and never call sign-in or sign-up", () => {
  const v = render(
    <SignInPage previewError="We couldn't sign you in. Check your email and password and try again." />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("We couldn't sign you in.");
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "fixture@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password" } });
  fireEvent.submit(screen.getByRole("button", { name: "Sign In" }).closest("form")!);
  expect(m.signIn).not.toHaveBeenCalled();
  v.unmount();
  render(
    <SignUpPage previewError="This password has appeared in a data breach. Please choose a different password." />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("data breach");
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "fixture@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password" } });
  fireEvent.submit(screen.getByRole("button", { name: "Create Account" }).closest("form")!);
  expect(m.signUp).not.toHaveBeenCalled();
});
