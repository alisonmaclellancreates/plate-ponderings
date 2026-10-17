import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const m = vi.hoisted(() => ({
  rows: vi.fn(),
  toggle: vi.fn(),
  recheck: vi.fn(),
  track: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/analytics", () => ({ track: m.track }));
vi.mock("@/lib/admin.functions", () => ({
  getReportedStories: m.rows,
  setStoryHidden: m.toggle,
  recheckAllPending: m.recheck,
}));
vi.mock("@/components/site/AiCheckStatus", () => ({ AiCheckStatus: () => null }));

import { LiveAdmin } from "@/components/site/LiveAdmin";
import { ADMIN_ERROR, ADMIN_REPORTS_KEY, RECHECK_PAUSED, recheckNote } from "@/lib/admin-copy";

const row = (id: string, status: "visible" | "hidden") => ({
  id,
  jurisdiction: "Utah",
  text: "CANYONS",
  handle: "maplegirl",
  meaning: `Meaning ${id}`,
  reports: 2,
  reasons: ["spam", "other"],
  status,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(ADMIN_REPORTS_KEY, [row("s1", "visible"), row("s2", "hidden")]);
  render(
    <QueryClientProvider client={client}>
      <LiveAdmin />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  m.rows.mockResolvedValue([row("s1", "visible"), row("s2", "hidden")]);
});

it("words the recheck note, with the early stop", () => {
  expect(recheckNote(3, 1, false)).toBe("3 changed. 1 still waiting for a safety check.");
  expect(recheckNote(0, 4, true)).toBe(
    "0 changed. 4 still waiting for a safety check. The check stopped early. Try again soon.",
  );
});

it("hides a visible story and unhides a hidden one, refreshing the list", async () => {
  m.toggle.mockResolvedValue({ outcome: "done" });
  renderPage();
  const rows = screen.getAllByRole("row");
  await userEvent.click(within(rows[1]!).getByRole("button", { name: "Hide" }));
  expect(m.toggle).toHaveBeenLastCalledWith({ data: { storyId: "s1", hidden: true } });
  expect(m.track).toHaveBeenLastCalledWith("admin_action", { action: "hide" });
  await userEvent.click(within(rows[2]!).getByRole("button", { name: "Unhide" }));
  expect(m.toggle).toHaveBeenLastCalledWith({ data: { storyId: "s2", hidden: false } });
  expect(m.track).toHaveBeenLastCalledWith("admin_action", { action: "unhide" });
  await waitFor(() => expect(m.rows).toHaveBeenCalled());
});

it.each([
  ["a refused toggle", () => m.toggle.mockResolvedValue({ outcome: "forbidden" })],
  ["a failed toggle", () => m.toggle.mockRejectedValue(new Error("x"))],
])("shows an error for %s", async (_l, arrange) => {
  arrange();
  renderPage();
  await userEvent.click(screen.getByRole("button", { name: "Hide" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(ADMIN_ERROR);
  expect(m.track).not.toHaveBeenCalled();
});

it("rechecks pending and shows changed and remaining counts", async () => {
  m.recheck.mockResolvedValue({ outcome: "done", changed: 2, remaining: 5, stopped: false });
  renderPage();
  expect(screen.queryByText(/still waiting/)).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Recheck pending" }));
  expect(await screen.findByText("2 changed. 5 still waiting for a safety check.")).toBeTruthy();
  expect(m.track).toHaveBeenCalledWith("admin_action", { action: "recheck" });
});

it.each([
  [{ outcome: "paused" }, RECHECK_PAUSED],
  [{ outcome: "error" }, ADMIN_ERROR],
])("explains a recheck that could not run: %o", async (result, text) => {
  m.recheck.mockResolvedValue(result);
  renderPage();
  await userEvent.click(screen.getByRole("button", { name: "Recheck pending" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(text);
});

it("shows an error when the recheck throws", async () => {
  m.recheck.mockRejectedValue(new Error("x"));
  renderPage();
  await userEvent.click(screen.getByRole("button", { name: "Recheck pending" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(ADMIN_ERROR);
});
