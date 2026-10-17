import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthWeakPasswordError } from "@supabase/supabase-js";
const m = vi.hoisted(() => ({
  signedOut: false,
  demoEnabled: false,
  account: { handle: "Traveler1234", isDemo: false, isAdmin: false },
  refresh: vi.fn(),
  out: vi.fn(),
  complete: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  navigate: vi.fn(),
  check: vi.fn(),
  save: vi.fn(),
  status: vi.fn(),
  resume: vi.fn(),
  track: vi.fn(),
  dotQuery: vi.fn(),
  location: { href: "/", pathname: "/" },
}));
vi.mock("@/lib/account-auth", () => ({
  useAccountAuth: () => ({
    account: m.signedOut ? null : m.account,
    refresh: m.refresh,
    signOut: m.out,
    completeSignIn: m.complete,
    demoEnabled: m.demoEnabled,
  }),
}));
vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (state: { location: typeof m.location }) => unknown }) =>
    select({ location: m.location }),
  Link: ({
    to,
    children,
    onClick,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    "aria-label"?: string;
  }) => (
    <a href={to} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => m.navigate,
}));
vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
  createMiddleware: () => ({ server: (fn: unknown) => fn }),
  createServerFn: () => {
    const builder: Record<string, unknown> = {};
    builder["middleware"] = () => builder;
    builder["inputValidator"] = () => builder;
    builder["handler"] = (fn: unknown) => fn;
    return builder;
  },
}));
vi.mock("@/lib/plates.functions", () => ({ recheckPendingSubjects: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signUp: m.signUp, signInWithPassword: m.signIn } },
}));
vi.mock("@/lib/accounts.functions", () => ({
  checkHandle: m.check,
  saveHandle: m.save,
  getAiCheckStatus: m.status,
  resumeAiChecks: m.resume,
}));
vi.mock("@/lib/analytics", () => ({ track: m.track }));
vi.mock("@tanstack/react-query", () => ({ useQuery: m.dotQuery }));
vi.mock("@/lib/submissions.functions", () => ({ getUnreadDot: vi.fn() }));
import { SignInPage, SignUpPage } from "@/components/site/Entry";
import { ProfilePage } from "@/components/site/Account";
import { MemberProfile, SiteHeader } from "@/components/site/SiteHeader";
import { AiCheckStatus } from "@/components/site/AiCheckStatus";

it.each(["signed-out", "demo", undefined] as const)(
  "uses cream keyboard rings for every navy-header control in %s mode",
  (mode) => {
    m.signedOut = mode === "signed-out" || mode === undefined;
    m.account.isDemo = mode === "demo";
    m.demoEnabled = true;
    render(<SiteHeader />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const header = screen.getByRole("banner");
    const controls = Array.from(header.querySelectorAll("a, button")).filter(
      (control) => !control.closest("ul"),
    );
    expect(controls.length).toBeGreaterThan(8);
    for (const control of controls) {
      expect(control).toHaveClass("focus-visible:ring-2", "focus-visible:ring-cream");
      expect(control).not.toHaveClass("focus-visible:ring-ring", "focus-visible:ring-navy");
    }
  },
);

beforeEach(() => {
  m.dotQuery.mockReturnValue({ data: undefined });
  vi.clearAllMocks();
  m.signedOut = false;
  m.demoEnabled = false;
  m.location = { href: "/", pathname: "/" };
  m.out.mockResolvedValue(undefined);
  m.account = { handle: "Traveler1234", isDemo: false, isAdmin: false };
  m.signIn.mockResolvedValue({ data: { session: {} }, error: null });
  m.signUp.mockResolvedValue({ data: { session: {} }, error: null });
  m.check.mockResolvedValue({ status: "available" });
  m.save.mockResolvedValue({ outcome: "changed", message: "Changes saved." });
  m.status.mockResolvedValue({
    allowed: true,
    category: "credit_block",
    blockedAt: "2026-10-17T00:00:00Z",
  });
  m.resume.mockResolvedValue({ resumed: true });
});
function fillEntry() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "fixture@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password" } });
  fireEvent.submit(screen.getByLabelText("Email").closest("form") as HTMLFormElement);
}
it("signin and signup return to a sanitized destination", async () => {
  const v = render(<SignInPage returnTo="/profile" />);
  fillEntry();
  await waitFor(() => expect(m.navigate).toHaveBeenCalledWith({ to: "/profile" }));
  expect(m.complete).toHaveBeenCalledWith("signed_in");
  v.unmount();
  render(<SignUpPage returnTo="https://evil.example" />);
  fillEntry();
  await waitFor(() => expect(m.complete).toHaveBeenCalledWith("signed_up"));
  expect(m.navigate).toHaveBeenLastCalledWith({ to: "/" });
});
it("signin failures are generic and do not navigate", async () => {
  m.signIn.mockResolvedValue({ error: { code: "invalid_credentials" } });
  const v = render(<SignInPage />);
  fillEntry();
  await screen.findByRole("alert");
  expect(m.navigate).not.toHaveBeenCalled();
  v.unmount();
  m.signIn.mockRejectedValue(new Error());
  render(<SignInPage />);
  fillEntry();
  await screen.findByRole("alert");
  expect(m.navigate).not.toHaveBeenCalled();
});
it("handles signup password failure, absent session and network error", async () => {
  m.signUp.mockResolvedValue({
    error: new AuthWeakPasswordError("Password is too weak", 422, ["pwned"]),
  });
  const v = render(<SignUpPage />);
  fillEntry();
  await screen.findByRole("alert");
  v.unmount();
  m.signUp.mockResolvedValue({ data: { session: null }, error: null });
  const v2 = render(<SignUpPage />);
  fillEntry();
  await screen.findByRole("alert");
  v2.unmount();
  m.signUp.mockRejectedValue(new Error());
  render(<SignUpPage />);
  fillEntry();
  await screen.findByRole("alert");
  expect(m.navigate).not.toHaveBeenCalled();
});
it("ignores empty submissions", () => {
  render(<SignInPage />);
  fireEvent.submit(screen.getByLabelText("Email").closest("form") as HTMLFormElement);
  expect(m.signIn).not.toHaveBeenCalled();
});
it("profile saves update identity and emit an empty event", async () => {
  render(<ProfilePage />);
  fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "Alison42" } });
  await screen.findByText("Available");
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(m.refresh).toHaveBeenCalled());
  expect(m.track).toHaveBeenCalledWith("handle_changed", {});
});
it.each(["admin", "rowan!"])(
  "invalid draft %s never triggers availability or refresh",
  async (draft) => {
    render(<ProfilePage />);
    fireEvent.change(screen.getByLabelText("Handle"), { target: { value: draft } });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(m.check).not.toHaveBeenCalled();
    expect(m.refresh).not.toHaveBeenCalled();
  },
);
it("profile rejection and unavailable save preserve the account", async () => {
  m.save.mockResolvedValue({ outcome: "rejected", message: "rejected" });
  const v = render(<ProfilePage />);
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(m.track).toHaveBeenCalledWith("handle_rejected", {}));
  expect(m.refresh).not.toHaveBeenCalled();
  v.unmount();
  m.save.mockRejectedValue(new Error());
  render(<ProfilePage />);
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await screen.findByRole("alert");
  expect(m.account.handle).toBe("Traveler1234");
});
it("demo edits are disabled without availability calls", () => {
  m.account.isDemo = true;
  render(<ProfilePage />);
  expect(screen.getByLabelText("Handle")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  expect(m.check).not.toHaveBeenCalled();
});
it("availability failures do not mark the handle available", async () => {
  m.check.mockRejectedValue(new Error());
  render(<ProfilePage />);
  await waitFor(() => expect(m.check).toHaveBeenCalled());
  expect(screen.queryByText("Available")).toBeNull();
});
it.each(["available", "taken", "unknown", null] as const)(
  "renders the current typing check status %s without saving",
  async (status) => {
    m.check.mockResolvedValue({ status });
    render(<ProfilePage />);
    fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "Traveler7444" } });
    await waitFor(() => expect(m.check).toHaveBeenCalledWith({ data: { handle: "Traveler7444" } }));
    if (status === "taken") {
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "That handle is taken. Choose another.",
      );
    } else {
      expect(screen.queryByRole("alert")).toBeNull();
      expect(Boolean(screen.queryByText("Available"))).toBe(status === "available");
    }
    expect(m.save).not.toHaveBeenCalled();
  },
);
it("never shows the current own handle as taken, ignoring case", async () => {
  m.check.mockResolvedValue({ status: "taken" });
  render(<ProfilePage />);
  fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "traveler1234" } });
  await screen.findByText("Available");
  expect(screen.queryByRole("alert")).toBeNull();
});
it("ignores a stale taken response for earlier valid input and hides resolved results on edits", async () => {
  let resolve: ((value: { status: "taken" }) => void) | undefined;
  m.check.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render(<ProfilePage />);
  fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "Traveler7444" } });
  await waitFor(() => expect(m.check).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "Fresh_Handle" } });
  await act(async () => {
    resolve?.({ status: "taken" });
  });
  expect(screen.queryByRole("alert")).toBeNull();
  await screen.findByText("Available");
  fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "Another_Handle" } });
  expect(screen.queryByText("Available")).toBeNull();
});
it("member menus show only authorized admin actions and keep the menu open with the signout error", async () => {
  const v = render(<SiteHeader />);
  fireEvent.click(screen.getAllByRole("button", { name: "Traveler1234 menu" })[0] as HTMLElement);
  expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
  m.out.mockRejectedValueOnce(new Error());
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("alert")).toHaveTextContent("We couldn't sign you out. Try again.");
  expect(screen.getByRole("list", { name: "Profile" })).toBeInTheDocument();
  expect(m.out).toHaveBeenCalledTimes(1);
  v.unmount();
  m.account.isAdmin = true;
  render(<SiteHeader />);
  fireEvent.click(screen.getAllByRole("button", { name: "Traveler1234 menu" })[0] as HTMLElement);
  expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
});
it.each(["Your Submissions", "Your Profile", "Admin"])(
  "closes the profile immediately when %s is chosen, even on the current page",
  (label) => {
    m.account.isAdmin = true;
    render(<MemberProfile showHandle />);
    const toggle = screen.getByRole("button", { name: "Traveler1234 menu" });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("link", { name: label }));
    expect(screen.queryByRole("list", { name: "Profile" })).toBeNull();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  },
);
it("a successful sign-out leaves the menu open until the route change closes it", async () => {
  m.out.mockResolvedValueOnce(undefined);
  const view = render(<MemberProfile showHandle={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Traveler1234 menu" }));
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  await waitFor(() => expect(m.out).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("list", { name: "Profile" })).toBeInTheDocument();
  m.location = { href: "/profile", pathname: "/profile" };
  view.rerender(<MemberProfile showHandle={false} />);
  expect(screen.queryByRole("list", { name: "Profile" })).toBeNull();
});
it.each(["Explore", "Spot a Plate", "About", "Try the Demo"])(
  "closes the mobile menu immediately when %s is chosen",
  (label) => {
    m.demoEnabled = true;
    m.signedOut = true;
    render(<SiteHeader />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Mobile" })).getByRole("link", { name: label }),
    );
    expect(screen.queryByRole("navigation", { name: "Mobile" })).toBeNull();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  },
);
it("closes both profile instances and the mobile menu on location changes, including back/forward and search-only changes", () => {
  const view = render(<SiteHeader />);
  for (const href of ["/profile", "/", "/profile", "/profile?tab=1"]) {
    for (const toggle of screen.getAllByRole("button", { name: "Traveler1234 menu" }))
      fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getAllByRole("list", { name: "Profile" })).toHaveLength(2);
    m.location = { href, pathname: href.split("?")[0] ?? href };
    view.rerender(<SiteHeader />);
    expect(screen.queryAllByRole("list", { name: "Profile" })).toHaveLength(0);
    expect(screen.queryByRole("navigation", { name: "Mobile" })).toBeNull();
  }
});
it("admin sees the blocked design and success only after a confirmed resume", async () => {
  m.account.isAdmin = true;
  render(<AiCheckStatus />);
  await screen.findByTestId("blocked-icon");
  expect(screen.getByText("Blocked")).toBeInTheDocument();
  expect(
    screen.getByText(
      "AI checks are paused. Nothing is published without a check. People keep their current handles.",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText("AI checks resumed.")).toBeNull();
  m.status.mockResolvedValue({ allowed: true, category: null });
  fireEvent.click(screen.getByRole("button", { name: "Resume AI checks" }));
  await screen.findByText("AI checks resumed.");
  expect(screen.getByText("Ready")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Resume AI checks" })).toBeNull();
  expect(m.resume).toHaveBeenCalledTimes(1);
});
it("a confirmed resume that still reads blocked shows no success", async () => {
  m.account.isAdmin = true;
  render(<AiCheckStatus />);
  await screen.findByTestId("blocked-icon");
  fireEvent.click(screen.getByRole("button", { name: "Resume AI checks" }));
  await screen.findByTestId("blocked-icon");
  expect(screen.queryByText("AI checks resumed.")).toBeNull();
  expect(m.resume).toHaveBeenCalledTimes(1);
});
it("admin reset failures and status errors keep the blocked state", async () => {
  m.account.isAdmin = true;
  m.resume.mockResolvedValue({ resumed: false });
  const v = render(<AiCheckStatus />);
  await screen.findByTestId("blocked-icon");
  fireEvent.click(screen.getByRole("button", { name: "Resume AI checks" }));
  await screen.findByRole("alert");
  expect(screen.getByTestId("blocked-icon")).toBeInTheDocument();
  expect(screen.queryByText("AI checks resumed.")).toBeNull();
  v.unmount();
  m.resume.mockRejectedValue(new Error());
  const v2 = render(<AiCheckStatus />);
  await screen.findByTestId("blocked-icon");
  fireEvent.click(screen.getByRole("button", { name: "Resume AI checks" }));
  await screen.findByRole("alert");
  expect(screen.getByTestId("blocked-icon")).toBeInTheDocument();
  v2.unmount();
  m.status.mockRejectedValue(new Error());
  render(<AiCheckStatus />);
  await screen.findByRole("alert");
});
it("non-admin and demo cannot inspect operational status", () => {
  const v = render(<AiCheckStatus />);
  expect(m.status).not.toHaveBeenCalled();
  v.unmount();
  m.account.isAdmin = true;
  m.account.isDemo = true;
  render(<AiCheckStatus />);
  expect(m.status).not.toHaveBeenCalled();
});
it("does not submit profile changes without an account", () => {
  m.signedOut = true;
  render(<ProfilePage />);
  fireEvent.submit(screen.getByLabelText("Handle").closest("form") as HTMLFormElement);
  expect(m.save).not.toHaveBeenCalled();
  expect(m.check).not.toHaveBeenCalled();
  expect(m.refresh).not.toHaveBeenCalled();
});
it("ignores duplicate profile saves while the first is pending", async () => {
  let resolve: ((value: { outcome: string; message: string }) => void) | undefined;
  m.save.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render(<ProfilePage />);
  const form = screen.getByLabelText("Handle").closest("form") as HTMLFormElement;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(m.save).toHaveBeenCalledTimes(1);
  await act(async () => {
    resolve?.({ outcome: "unavailable", message: "Try again soon." });
  });
  expect(m.refresh).not.toHaveBeenCalled();
  expect(m.track).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();
});
it("ignores a stale availability response after the draft becomes invalid", async () => {
  let resolve: ((value: { status: "available" | "taken" | "unknown" }) => void) | undefined;
  m.check.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render(<ProfilePage />);
  await waitFor(() => expect(m.check).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "a-" } });
  await act(async () => {
    resolve?.({ status: "available" });
  });
  expect(screen.queryByText("Available")).toBeNull();
  expect(m.check).toHaveBeenCalledTimes(1);
  expect(m.save).not.toHaveBeenCalled();
});
it.each(["signin", "signup"])(
  "ignores duplicate %s submissions until the first completes",
  async (kind) => {
    const submit = kind === "signin" ? m.signIn : m.signUp;
    let resolve: ((value: { data: { session: object }; error: null }) => void) | undefined;
    submit.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    render(kind === "signin" ? <SignInPage /> : <SignUpPage />);
    fillEntry();
    fireEvent.submit(screen.getByLabelText("Email").closest("form") as HTMLFormElement);
    expect(submit).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve?.({ data: { session: {} }, error: null });
    });
    expect(m.complete).toHaveBeenCalledTimes(1);
    expect(m.navigate).toHaveBeenCalledTimes(1);
  },
);
it.each(["Email", "Password"])(
  "does not authenticate when the %s field is excluded from submitted form data",
  (label) => {
    render(<SignInPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "fixture@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password" } });
    const input = screen.getByLabelText(label) as HTMLInputElement;
    input.disabled = true;
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(m.signIn).not.toHaveBeenCalled();
    expect(m.complete).not.toHaveBeenCalled();
    expect(m.navigate).not.toHaveBeenCalled();
  },
);
it("a signed-out member profile exposes no account menu or sign-out action", () => {
  m.signedOut = true;
  const view = render(<MemberProfile showHandle />);
  expect(view.container).toBeEmptyDOMElement();
  expect(m.out).not.toHaveBeenCalled();
});

it.each([
  [true, 1],
  [false, 0],
])("the profile icon shows the unread dot only when unread is %s", (unread, count) => {
  m.signedOut = false;
  m.demoEnabled = false;
  m.dotQuery.mockReturnValue({ data: { unread } });
  render(<MemberProfile showHandle />);
  expect(screen.queryAllByTestId("unread-dot")).toHaveLength(count);
  fireEvent.click(screen.getByRole("button", { name: "Traveler1234 menu" }));
  expect(screen.queryAllByTestId("menu-unread-dot")).toHaveLength(count);
  expect(m.dotQuery).toHaveBeenCalledWith(
    expect.objectContaining({ queryKey: ["unread-dot"], enabled: true }),
  );
});
