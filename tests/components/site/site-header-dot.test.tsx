import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const m = vi.hoisted(() => ({ dot: vi.fn() }));
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
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/submissions.functions", () => ({ getUnreadDot: m.dot }));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
import { MemberProfile } from "@/components/site/SiteHeader";

function renderSignedIn() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemberProfile showHandle />
    </QueryClientProvider>,
  );
}

it("shows the unread dot when getUnreadDot reports unread", async () => {
  m.dot.mockResolvedValue({ unread: true });
  renderSignedIn();
  expect(await screen.findByTestId("unread-dot")).toBeTruthy();
  expect(screen.getByText("New updates")).toBeTruthy();
  expect(m.dot).toHaveBeenCalledTimes(1);
});

it("shows no dot when getUnreadDot reports nothing unread", async () => {
  m.dot.mockResolvedValue({ unread: false });
  renderSignedIn();
  await vi.waitFor(() => expect(m.dot).toHaveBeenCalledTimes(1));
  await new Promise((r) => setTimeout(r, 0));
  expect(screen.queryByTestId("unread-dot")).toBeNull();
  expect(screen.queryByText("New updates")).toBeNull();
});
