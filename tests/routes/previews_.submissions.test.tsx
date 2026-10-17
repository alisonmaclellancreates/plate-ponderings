import { expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import {
  dismissSubmission,
  getSubmissions,
  getUnreadDot,
  markSubmissionsRead,
} from "@/lib/submissions.functions";

vi.mock("@/lib/submissions.functions", () => ({
  dismissSubmission: vi.fn(),
  getSubmissions: vi.fn(),
  getUnreadDot: vi.fn(),
  markSubmissionsRead: vi.fn(),
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (id: string) => (options: Record<string, unknown>) => ({ ...options, id }),
  Link: ({ params, children }: { params: { state: string }; children: ReactNode }) => (
    <a href={`/plate/${params.state}`}>{children}</a>
  ),
}));
import { Route } from "@/routes/previews_.submissions";

const route = Route as unknown as {
  id: string;
  loader?: unknown;
  component: () => ReactNode;
  head: () => { meta: Record<string, string>[] };
};

it("uses the unnested, loader-free route with its own head", () => {
  expect(route.id).toBe("/previews_/submissions");
  expect(route.loader).toBeUndefined();
  expect(route.head().meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(
    "Your Submissions sample preview | What the Plate?",
  );
});

it("shows every row type with Updated labels, and Dismiss changes nothing", async () => {
  const Page = route.component;
  render(<Page />);
  const rows = screen.getAllByTestId("submission");
  expect(rows).toHaveLength(6);
  const text = rows.map((r) => r.textContent ?? "");
  expect(text[0]).toContain("This plate is live with 2 stories.");
  expect(text[1]).toContain("Your story is live and has 1 heart.");
  expect(text[2]).toContain("Waiting for its check.");
  expect(text[3]).toContain("Waiting for its check.");
  expect(text[4]).toContain("We couldn't add your plate.");
  expect(text[5]).toContain("We couldn't add your story.");
  const pendingStory = rows[3];
  if (!pendingStory) throw new Error("Missing pending story row");
  expect(
    within(pendingStory).getAllByRole("link", { name: "View Plate" })[0]?.getAttribute("href"),
  ).toBe("/plate/pnw-lv");
  expect(screen.getAllByText("Updated")).toHaveLength(3);
  const dismiss = screen.getAllByRole("button", { name: "Dismiss" });
  expect(dismiss).toHaveLength(4); // mobile and desktop copies of two rows
  const first = dismiss[0];
  if (!first) throw new Error("Missing Dismiss");
  await userEvent.setup().click(first);
  expect(screen.getAllByTestId("submission")).toHaveLength(6);
  expect(screen.queryByRole("alert")).toBeNull();
  for (const fn of [dismissSubmission, getSubmissions, getUnreadDot, markSubmissionsRead])
    expect(fn).not.toHaveBeenCalled();
});
