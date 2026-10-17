import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const m = vi.hoisted(() => ({
  blocked: vi.fn(),
  unblock: vi.fn(),
  remove: vi.fn(),
  track: vi.fn(),
  reset: vi.fn(),
  signOut: vi.fn(),
  navigate: vi.fn(),
  order: [] as string[],
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => m.navigate,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock("@/components/site/SpotPlate", () => ({ ScenicHeader: () => null }));
vi.mock("@/lib/analytics", () => ({ track: m.track, reset: m.reset }));
vi.mock("@/lib/story-actions.functions", () => ({
  getBlockedPeople: m.blocked,
  unblockUser: m.unblock,
}));
vi.mock("@/lib/account-delete.functions", () => ({ deleteAccount: m.remove }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signOut: m.signOut } } }));

import {
  BLOCKED_KEY,
  LiveDeleteConfirm,
  LiveSettings,
  SETTINGS_ERROR,
} from "@/components/site/LiveSettings";
import { DEMO_MESSAGE } from "@/lib/account-rules";

let client: QueryClient;
function renderWith(ui: ReactNode) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(BLOCKED_KEY, [{ key: "a", handle: "maplegirl" }]);
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  m.order = [];
  m.blocked.mockResolvedValue([]);
  for (const [name, fn] of [
    ["track", m.track],
    ["reset", m.reset],
    ["signOut", m.signOut],
    ["navigate", m.navigate],
  ] as const)
    fn.mockImplementation(() => {
      m.order.push(name);
      return Promise.resolve();
    });
});

describe("LiveSettings", () => {
  it("lists blocked people and unblocks by key", async () => {
    m.unblock.mockResolvedValue({ outcome: "done" });
    renderWith(<LiveSettings />);
    expect(screen.getByText("maplegirl")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Unblock" }));
    expect(m.unblock).toHaveBeenCalledWith({ data: { key: "a" } });
    expect(m.track).toHaveBeenCalledWith("user_unblocked", {});
    await waitFor(() => expect(m.blocked).toHaveBeenCalled());
  });
  it.each([
    [
      "demo",
      () => m.unblock.mockResolvedValue({ outcome: "demo", message: DEMO_MESSAGE }),
      DEMO_MESSAGE,
    ],
    ["error", () => m.unblock.mockResolvedValue({ outcome: "error" }), SETTINGS_ERROR],
    ["throw", () => m.unblock.mockRejectedValue(new Error("x")), SETTINGS_ERROR],
  ])("explains a refused unblock: %s", async (_l, arrange, text) => {
    arrange();
    renderWith(<LiveSettings />);
    await userEvent.click(screen.getByRole("button", { name: "Unblock" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(m.track).not.toHaveBeenCalled();
  });
});

describe("LiveDeleteConfirm", () => {
  it("deletes, then sends account_deleted, resets, signs out locally and goes home", async () => {
    m.remove.mockResolvedValue({ outcome: "deleted" });
    renderWith(<LiveDeleteConfirm />);
    await userEvent.click(screen.getByRole("button", { name: "Delete Account" }));
    await waitFor(() => expect(m.navigate).toHaveBeenCalledWith({ to: "/", replace: true }));
    expect(m.track).toHaveBeenCalledWith("account_deleted", {});
    expect(m.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(m.order).toEqual(["track", "reset", "signOut", "navigate"]);
    expect(client.getQueryData(BLOCKED_KEY)).toBeUndefined();
  });
  it.each([
    [
      "demo",
      () => m.remove.mockResolvedValue({ outcome: "demo", message: DEMO_MESSAGE }),
      DEMO_MESSAGE,
    ],
    ["error", () => m.remove.mockResolvedValue({ outcome: "error" }), SETTINGS_ERROR],
    ["throw", () => m.remove.mockRejectedValue(new Error("x")), SETTINGS_ERROR],
  ])(
    "never sends account_deleted when deletion does not succeed: %s",
    async (_l, arrange, text) => {
      arrange();
      renderWith(<LiveDeleteConfirm />);
      await userEvent.click(screen.getByRole("button", { name: "Delete Account" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(text);
      expect(m.track).not.toHaveBeenCalled();
      expect(m.signOut).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Delete Account" })).toBeEnabled();
    },
  );
});
