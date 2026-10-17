import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  user: vi.fn(),
  get: vi.fn(),
  demo: vi.fn(),
  out: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  setDemo: vi.fn(),
  track: vi.fn(),
  cancel: vi.fn(),
  clear: vi.fn(),
  invalidate: vi.fn(),
  routerInvalidate: vi.fn(),
  navigate: vi.fn(),
  unsubscribe: vi.fn(),
  subscribe: vi.fn(),
  recheck: vi.fn(),
  listener: null as null | ((event: string) => void),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: m.user,
      signOut: m.out,
      onAuthStateChange: (listener: (event: string) => void) => {
        m.subscribe();
        m.listener = listener;
        return { data: { subscription: { unsubscribe: m.unsubscribe } } };
      },
    },
  },
}));
vi.mock("@/lib/accounts.functions", () => ({ getAccount: m.get, getDemoSetting: m.demo }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/plates.functions", () => ({ recheckPendingSubjects: m.recheck }));
vi.mock("@tanstack/react-query", () => {
  const client = {
    cancelQueries: m.cancel,
    clear: m.clear,
    invalidateQueries: m.invalidate,
  };
  return { useQueryClient: () => client };
});
vi.mock("@tanstack/react-router", () => {
  const router = { invalidate: m.routerInvalidate, navigate: m.navigate };
  return { useRouter: () => router };
});
vi.mock("@/lib/analytics", () => ({
  identify: m.identify,
  reset: m.reset,
  setDemo: m.setDemo,
  track: m.track,
}));
import { AccountProvider } from "@/lib/auth-context";
import { useAccountAuth, type Account } from "@/lib/account-auth";
function Consumer() {
  const auth = useAccountAuth();
  return (
    <>
      <p>{auth?.loading ? "loading" : (auth?.account?.handle ?? "signed out")}</p>
      <p>{String(auth?.demoEnabled)}</p>
      <button onClick={() => void auth?.signOut().catch(() => {})}>out</button>
      <button onClick={() => void auth?.completeSignIn("signed_in")}>in</button>
      <button onClick={() => void auth?.refresh()}>refresh</button>
    </>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  m.user.mockResolvedValue({ data: { user: { id: "auth-id" } } });
  m.get.mockResolvedValue({ handle: "Traveler1234", isDemo: false, isAdmin: false });
  m.demo.mockResolvedValue({ demoEnabled: true });
  m.out.mockResolvedValue({ error: null });
  m.recheck.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());
it("hydrates only safe account fields and identifies with auth id", async () => {
  const v = render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await screen.findByText("Traveler1234");
  expect(m.identify).toHaveBeenCalledWith("auth-id");
  expect(m.setDemo).toHaveBeenCalledWith(false);
  expect(screen.getByText("true")).toBeInTheDocument();
  v.unmount();
  expect(m.unsubscribe).toHaveBeenCalled();
});
it("ignores token and initial events and handles identity changes", async () => {
  render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await screen.findByText("Traveler1234");
  await act(async () => {
    m.listener?.("TOKEN_REFRESHED");
    m.listener?.("INITIAL_SESSION");
  });
  expect(m.routerInvalidate).not.toHaveBeenCalled();
  await act(async () => {
    m.listener?.("SIGNED_IN");
  });
  expect(m.routerInvalidate).toHaveBeenCalledTimes(1);
  expect(m.invalidate).toHaveBeenCalledTimes(1);
  await act(async () => {
    m.listener?.("USER_UPDATED");
  });
  expect(m.routerInvalidate).toHaveBeenCalledTimes(2);
  await act(async () => {
    m.listener?.("SIGNED_OUT");
  });
  await screen.findByText("signed out");
  expect(m.invalidate).toHaveBeenCalledTimes(2);
  expect(m.reset).toHaveBeenCalled();
});
it("signs out with ordered cache teardown and replacement navigation", async () => {
  render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await screen.findByText("Traveler1234");
  fireEvent.click(screen.getByText("out"));
  await waitFor(() =>
    expect(m.navigate).toHaveBeenCalledWith({
      to: "/sign-in",
      search: { returnTo: "/" },
      replace: true,
    }),
  );
  expect(m.cancel.mock.invocationCallOrder[0]).toBeLessThan(
    m.clear.mock.invocationCallOrder[0] ?? 0,
  );
  expect(m.clear.mock.invocationCallOrder[0]).toBeLessThan(m.out.mock.invocationCallOrder[0] ?? 0);
  expect(m.track).toHaveBeenCalledWith("signed_out", {});
});
it("exits the demo to public home and never starts a pending recheck", async () => {
  m.get.mockResolvedValue({ handle: "Traveler4821", isDemo: true, isAdmin: false });
  render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await screen.findByText("Traveler4821");
  expect(m.setDemo).toHaveBeenCalledWith(true);
  expect(m.recheck).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("out"));
  await waitFor(() => expect(m.navigate).toHaveBeenCalledWith({ to: "/", replace: true }));
  expect(m.track).toHaveBeenCalledWith("demo_exited", {});
  expect(m.reset).toHaveBeenCalledOnce();
});
it("does not navigate after a failed signout", async () => {
  m.out.mockResolvedValue({ error: new Error("failed") });
  render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await screen.findByText("Traveler1234");
  fireEvent.click(screen.getByText("out"));
  await waitFor(() => expect(m.out).toHaveBeenCalled());
  expect(m.navigate).not.toHaveBeenCalled();
});
it("captures completed signin after hydration", async () => {
  render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await screen.findByText("Traveler1234");
  fireEvent.click(screen.getByText("in"));
  await waitFor(() => expect(m.track).toHaveBeenCalledWith("signed_in", {}));
});
it("fails closed when signed out or hydration is unavailable", async () => {
  m.user.mockResolvedValue({ data: { user: null } });
  m.demo.mockRejectedValue(new Error());
  const v = render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await screen.findByText("signed out");
  expect(m.get).not.toHaveBeenCalled();
  v.unmount();
  m.user.mockRejectedValue(new Error());
  render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await screen.findByText("signed out");
});
it("ignores a stale account read after signout", async () => {
  let resolve: ((v: unknown) => void) | undefined;
  m.get.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await waitFor(() => expect(m.get).toHaveBeenCalled());
  await act(async () => {
    m.listener?.("SIGNED_OUT");
    resolve?.({ handle: "stale", isDemo: false });
  });
  expect(screen.queryByText("stale")).toBeNull();
  await screen.findByText("signed out");
});
it("keeps one auth subscription across account updates and rerenders", async () => {
  const content = (
    <AccountProvider>
      <Consumer />
    </AccountProvider>
  );
  const v = render(content);
  await screen.findByText("Traveler1234");
  v.rerender(content);
  await act(async () => {
    m.listener?.("USER_UPDATED");
  });
  expect(m.subscribe).toHaveBeenCalledTimes(1);
  expect(m.unsubscribe).not.toHaveBeenCalled();
  v.unmount();
  expect(m.unsubscribe).toHaveBeenCalledTimes(1);
});
it("invalidates an in-flight account read when the provider unmounts", async () => {
  let resolve: ((value: Account) => void) | undefined;
  m.get.mockReturnValue(new Promise<Account>((r) => (resolve = r)));
  const v = render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await waitFor(() => expect(m.get).toHaveBeenCalled());
  v.unmount();
  await act(async () => {
    resolve?.({ handle: "stale", isDemo: false, isAdmin: false });
  });
  expect(m.identify).not.toHaveBeenCalled();
  expect(m.setDemo).not.toHaveBeenCalled();
  expect(m.unsubscribe).toHaveBeenCalledTimes(1);
});
it("finishes loading when an auth-change account refresh fails", async () => {
  render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await screen.findByText("Traveler1234");
  m.get.mockRejectedValueOnce(new Error("account unavailable"));
  await act(async () => {
    m.listener?.("USER_UPDATED");
  });
  expect(screen.queryByText("loading")).toBeNull();
  expect(screen.getByText("Traveler1234")).toBeInTheDocument();
  expect(m.identify).toHaveBeenCalledTimes(1);
});
it("does not erase a newer account when an older signed-out read resolves", async () => {
  let resolve: ((value: { data: { user: null } }) => void) | undefined;
  m.user.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await waitFor(() => expect(m.user).toHaveBeenCalledTimes(1));
  await act(async () => {
    m.listener?.("SIGNED_IN");
  });
  await screen.findByText("Traveler1234");
  await act(async () => {
    resolve?.({ data: { user: null } });
  });
  expect(screen.getByText("Traveler1234")).toBeInTheDocument();
  expect(m.identify).toHaveBeenCalledTimes(1);
});
it("temporarily signs out after a timeout, then restores a late verified account", async () => {
  vi.useFakeTimers();
  let resolve: (value: unknown) => void = () => {};
  m.user.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(screen.getByText("signed out")).toBeInTheDocument();
  expect(screen.queryByText("loading")).toBeNull();
  expect(m.out).not.toHaveBeenCalled();
  await act(async () => {
    resolve({ data: { user: { id: "late-id" } }, error: null });
  });
  expect(screen.getByText("Traveler1234")).toBeInTheDocument();
  expect(m.identify).toHaveBeenCalledWith("late-id");
});
it.each([401, 403])("shows signed out and clears a rejected saved session (%s)", async (status) => {
  m.user.mockResolvedValue({ data: { user: null }, error: { status } });
  render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await screen.findByText("signed out");
  expect(m.out).toHaveBeenCalledWith({ scope: "local" });
  expect(m.get).not.toHaveBeenCalled();
});
it("ignores late success after the visitor has signed out", async () => {
  vi.useFakeTimers();
  let resolve: (value: unknown) => void = () => {};
  m.user.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
    m.listener?.("SIGNED_OUT");
  });
  await act(async () => {
    resolve({ data: { user: { id: "stale" } } });
  });
  expect(screen.getByText("signed out")).toBeInTheDocument();
  expect(m.get).not.toHaveBeenCalled();
  expect(m.identify).not.toHaveBeenCalled();
});
it("refreshes the unread dot once the background recheck resolves", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 8 * 60 * 1000);
  m.recheck.mockResolvedValue(undefined);
  render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(m.recheck).toHaveBeenCalledTimes(1);
  expect(m.invalidate).toHaveBeenCalledWith({ queryKey: ["unread-dot"] });
});
it("keeps the verified account when the background pending recheck fails", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 16 * 60 * 1000);
  m.recheck.mockRejectedValue(new Error("recheck unavailable"));
  render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(m.recheck).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Traveler1234")).toBeInTheDocument();
  expect(screen.queryByText("loading")).toBeNull();
  expect(m.out).not.toHaveBeenCalled();
  expect(m.invalidate).not.toHaveBeenCalledWith({ queryKey: ["unread-dot"] });
});
it("finishes initial loading when the verified account read fails", async () => {
  m.get.mockRejectedValue(new Error("account unavailable"));
  render(
    <AccountProvider>
      <Consumer />
    </AccountProvider>,
  );
  await screen.findByText("signed out");
  expect(screen.queryByText("loading")).toBeNull();
  expect(m.identify).not.toHaveBeenCalled();
  expect(m.out).not.toHaveBeenCalled();
});
