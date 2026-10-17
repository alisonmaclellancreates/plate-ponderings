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
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => m.navigate,
}));
vi.mock("@tanstack/react-start", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useServerFn: (fn: unknown) => fn,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signUp: m.signUp, signInWithPassword: m.signIn } },
}));
import { HandleField } from "@/components/site/Account";
import { SignInPage, SignUpPage } from "@/components/site/Entry";
import { AiCheckStatusPanel } from "@/components/site/AiCheckStatus";
import { HANDLE_REJECTED, HANDLE_TAKEN } from "@/lib/account-rules";
import { Route as AccountPreviewsRoute } from "@/routes/previews_.account";

beforeEach(() => vi.clearAllMocks());

it("handle field previews show each rule-based message and the available badge", () => {
  const v = render(<HandleField draft="Rowan_Design" status="available" />);
  expect(screen.getByText("Available")).toBeInTheDocument();
  v.rerender(<HandleField draft="Traveler7444" status="taken" />);
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

it("handle field is full width with feedback directly beneath it", () => {
  render(<HandleField draft="admin" />);
  const input = screen.getByLabelText("Handle");
  expect(input.className).toContain("w-full");
  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("That handle is reserved. Choose another.");
  expect(input.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(input.getAttribute("aria-describedby")).toContain(alert.id);
});

it("two handle fields on one page keep their own names and descriptions", () => {
  render(
    <>
      <HandleField draft="admin" />
      <HandleField draft="rowan!" />
    </>,
  );
  const inputs = screen.getAllByLabelText("Handle");
  expect(inputs).toHaveLength(2);
  expect(inputs[0]!.id).not.toBe(inputs[1]!.id);
  const first = inputs[0]!.getAttribute("aria-describedby")!.split(" ");
  const second = inputs[1]!.getAttribute("aria-describedby")!.split(" ");
  for (const id of first) expect(second).not.toContain(id);
  const described = (el: HTMLElement) =>
    el
      .getAttribute("aria-describedby")!
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");
  expect(described(inputs[0]!)).toContain("reserved");
  expect(described(inputs[0]!)).not.toContain("letters, numbers, and underscores only");
  expect(described(inputs[1]!)).toContain("Use letters, numbers, and underscores only.");
});

it("account errors use coral text with a decorative icon; success stays calm", () => {
  const v = render(<HandleField draft="Rowan_Design" message={HANDLE_TAKEN} />);
  const alert = screen.getByRole("alert");
  expect(alert.className).toContain("text-coral-cta");
  expect(alert.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  v.rerender(<HandleField draft="Rowan_Design" message="Changes saved." />);
  expect(screen.queryByRole("alert")).toBeNull();
  const status = screen.getByRole("status");
  expect(status).toHaveTextContent("Changes saved.");
  expect(status.className).not.toContain("text-coral-cta");
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
  const v = render(<AiCheckStatusPanel status={{ allowed: true, category: null }} />);
  expect(screen.getByText("Ready")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Resume AI checks" })).toBeNull();
  v.unmount();
  render(
    <AiCheckStatusPanel
      status={{ allowed: true, category: "credit_block", blockedAt: "2026-10-17T01:00:00.000Z" }}
    />,
  );
  expect(screen.getByTestId("blocked-icon")).toBeInTheDocument();
  expect(screen.getByText("Blocked")).toBeInTheDocument();
  expect(
    screen.getByText(
      "AI checks are paused. Nothing is published without a check. People keep their current handles.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText(/^Paused since /)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Resume AI checks" }));
  expect(screen.queryByText("AI checks resumed.")).toBeNull();
});

it("entry errors are coral, iconed, and linked to their fields", () => {
  render(
    <SignInPage previewError="We couldn't sign you in. Check your email and password and try again." />,
  );
  const alert = screen.getByRole("alert");
  expect(alert.className).toContain("text-coral-cta");
  expect(alert.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  for (const label of ["Email", "Password"]) {
    expect(screen.getByLabelText(label).getAttribute("aria-describedby")).toContain(alert.id);
  }
});

it("two entry forms on one page keep their own field ids", () => {
  render(
    <>
      <SignUpPage previewError="Please choose a stronger password with at least 8 characters." />
      <SignUpPage previewError="This password has appeared in a data breach. Please choose a different password." />
    </>,
  );
  const emails = screen.getAllByLabelText("Email");
  const passwords = screen.getAllByLabelText("Password");
  expect(emails[0]!.id).not.toBe(emails[1]!.id);
  expect(passwords[0]!.id).not.toBe(passwords[1]!.id);
  expect(emails[0]!.getAttribute("aria-describedby")).not.toBe(
    emails[1]!.getAttribute("aria-describedby"),
  );
});

it("the previews page renders every account state section", () => {
  const AccountPreviews = AccountPreviewsRoute.options.component as React.ComponentType;
  render(<AccountPreviews />);
  expect(screen.getByRole("heading", { name: "Account previews" })).toBeInTheDocument();
  for (const title of [
    "Handle field, available",
    "Handle field, taken",
    "Handle field, reserved",
    "Handle field, invalid characters",
    "Handle field, wrong length",
    "Handle save, rejected by the check",
    "Handle save, changes saved",
    "AI check status, Ready",
    "AI check status, Blocked",
  ]) {
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  }
  expect(screen.getByRole("heading", { name: "Sign in, wrong password" })).toBeInTheDocument();
  expect(screen.getAllByRole("alert").length).toBe(9);
  expect(m.signIn).not.toHaveBeenCalled();
  expect(m.signUp).not.toHaveBeenCalled();
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
