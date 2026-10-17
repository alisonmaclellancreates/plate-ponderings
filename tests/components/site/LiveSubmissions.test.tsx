import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { Submission } from "@/lib/mock-data";

const m = vi.hoisted(() => ({
  data: { rows: [] as unknown[], unreadCount: 0 },
  markRead: vi.fn(),
  dismiss: vi.fn(),
  invalidate: vi.fn(),
  track: vi.fn(),
  fetched: vi.fn(),
  getRows: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: (o: { queryKey: unknown; queryFn: () => unknown }) => {
    m.fetched(o.queryKey, o.queryFn());
    return { data: m.data };
  },
  useQueryClient: () => ({ invalidateQueries: m.invalidate }),
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
vi.mock("@/lib/submissions.functions", () => ({
  getSubmissions: m.getRows,
  markSubmissionsRead: m.markRead,
  dismissSubmission: m.dismiss,
}));
vi.mock("@/lib/analytics", () => ({ track: m.track }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/plate">{children}</a>,
}));
vi.mock("@/lib/account-auth", () => ({ useAccountAuth: () => null }));
vi.mock("@/lib/accounts.functions", () => ({ checkHandle: vi.fn(), saveHandle: vi.fn() }));

import { LiveSubmissions } from "@/components/site/LiveSubmissions";

const row = (id: string, over: Partial<Submission>): Submission => ({
  id,
  jurisdiction: "Washington",
  text: id,
  kind: "story",
  date: "2026-10-09",
  moderation: "rejected",
  explanation: "We couldn't add your story.",
  action: "dismiss",
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  m.markRead.mockResolvedValue({ marked: true });
  m.data = {
    rows: [
      row("REJECTED", { updated: true }),
      row("PENDING", {
        kind: "plate",
        moderation: "pending",
        explanation: "Waiting for its check. We'll let you know when it's ready.",
        action: null,
      }),
    ],
    unreadCount: 2,
  };
});

it("fires submissions_viewed with the unread count, marks read, refreshes the dot, keeps labels", async () => {
  render(<LiveSubmissions />);
  await act(async () => {});
  expect(m.track).toHaveBeenCalledWith("submissions_viewed", { unread_count: 2 });
  expect(m.markRead).toHaveBeenCalledTimes(1);
  expect(m.invalidate).toHaveBeenCalledWith({ queryKey: ["unread-dot"] });
  expect(screen.getByText("Updated")).toBeInTheDocument();
  expect(screen.getAllByTestId("submission")).toHaveLength(2);
  expect(screen.queryAllByTestId("chevron")).toHaveLength(0);
  expect(m.fetched).toHaveBeenCalledWith(["submissions"], undefined);
  expect(m.getRows).toHaveBeenCalled();
});

it("still fires the event when marking read fails", async () => {
  m.markRead.mockRejectedValue(new Error("x"));
  render(<LiveSubmissions />);
  await act(async () => {});
  expect(m.track).toHaveBeenCalledTimes(1);
  expect(m.invalidate).not.toHaveBeenCalled();
});

it("removes a dismissed row", async () => {
  m.dismiss.mockResolvedValue({ outcome: "dismissed" });
  render(<LiveSubmissions />);
  await act(async () => {
    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[0] as HTMLElement);
  });
  expect(m.dismiss).toHaveBeenCalledWith({ data: { kind: "story", id: "REJECTED" } });
  expect(screen.getAllByTestId("submission")).toHaveLength(1);
});

it.each([
  [{ outcome: "demo", message: "Demo says no." }, "Demo says no."],
  [{ outcome: "demo" }, null],
])("shows the demo refusal and keeps the row (%j)", async (result, text) => {
  m.dismiss.mockResolvedValue(result);
  render(<LiveSubmissions />);
  await act(async () => {
    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[0] as HTMLElement);
  });
  expect(screen.getAllByTestId("submission")).toHaveLength(2);
  if (text) expect(screen.getByRole("alert")).toHaveTextContent(text);
  else expect(screen.queryByRole("alert")).toBeNull();
});

it("shows an error when dismiss fails", async () => {
  m.dismiss.mockRejectedValue(new Error("x"));
  render(<LiveSubmissions />);
  await act(async () => {
    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[0] as HTMLElement);
  });
  expect(screen.getByRole("alert")).toHaveTextContent("We couldn't dismiss that right now.");
  expect(screen.getAllByTestId("submission")).toHaveLength(2);
});
