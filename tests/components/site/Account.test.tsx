import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string;
    params?: Record<string, string>;
    children: ReactNode;
    className?: string;
  }) => (
    <a
      href={params ? to.replace(/\$(\w+)/, (_, k: string) => params[k] ?? "") : to}
      className={className}
    >
      {children}
    </a>
  ),
}));
vi.mock("@/lib/account-auth", () => ({
  useAccountAuth: () => ({ account: { handle: "Traveler1234", isDemo: false }, refresh: vi.fn() }),
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
vi.mock("@/lib/accounts.functions", () => ({
  checkHandle: async () => ({ status: "available" }),
  saveHandle: vi.fn(),
}));

import { HANDLE_HELP, ProfilePage, SubmissionsPage } from "@/components/site/Account";
import { PLATES, SUBMISSIONS } from "@/lib/mock-data";

describe("SubmissionsPage", () => {
  it("leaves preview Dismiss inert without a handler", () => {
    render(<SubmissionsPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[0] as HTMLElement);
    expect(screen.getAllByTestId("submission")).toHaveLength(SUBMISSIONS.length);
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("lists rows newest first with one h1", () => {
    render(<SubmissionsPage rows={[...SUBMISSIONS].reverse()} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const rows = screen.getAllByTestId("submission");
    expect(
      rows.map((r) => within(r).getByRole("img", { name: /plate/ }).getAttribute("aria-label")),
    ).toEqual([
      "Oregon plate PNW LV",
      "Washington plate DEBUGGR",
      "Utah plate CANYONS",
      "Colorado plate TRAILS",
      "California plate TEATIME",
    ]);
    expect(rows[0]).toHaveTextContent("Oregon · Plate submission · Oct 9, 2026");
    expect(rows[1]).toHaveTextContent("Washington · Plate submission · Oct 6, 2026");
  });

  it("matches each row's count to its plate or story in the mock data", () => {
    render(<SubmissionsPage />);
    const rows = screen.getAllByTestId("submission");
    const findPlate = (text: string) => PLATES.find((p) => p.text === text)!;
    const pnw = findPlate("PNW LV");
    expect(pnw.stories).toHaveLength(2);
    expect(
      within(rows[0]!).getAllByText("This plate is live with 2 stories.").length,
    ).toBeGreaterThan(0);
    // TRAILS has no plate record in the mock data yet, so its row only
    // carries the SUBMISSIONS explanation.
    expect(
      within(rows[3]!).getAllByText("This plate is live with 2 stories.").length,
    ).toBeGreaterThan(0);
    const teatimeStory = findPlate("TEATIME").stories.find((s) => s.handle === "Traveler4821")!;
    expect(teatimeStory.hearts).toBe(3);
    expect(
      within(rows[4]!).getAllByText("Your story is live and has 3 hearts.").length,
    ).toBeGreaterThan(0);
  });

  it("sorts rows newest first with TEATIME last", () => {
    render(<SubmissionsPage rows={[...SUBMISSIONS].reverse()} />);
    const rows = screen.getAllByTestId("submission");
    const last = rows[rows.length - 1]!;
    expect(within(last).getByRole("img", { name: "California plate TEATIME" })).toBeInTheDocument();
    expect(last).toHaveTextContent("Sep 26, 2026");
    const parsed = rows.map((r) => {
      const d = (r.textContent ?? "").match(/(\w{3} \d{1,2}, \d{4})/)?.[1] ?? "";
      return new Date(`${d} 12:00:00`).getTime();
    });
    for (let i = 1; i < parsed.length; i += 1) {
      expect(parsed[i]!).toBeLessThanOrEqual(parsed[i - 1]!);
    }
  });

  it("gives pending rows no action or chevron and marks updated rows", () => {
    render(<SubmissionsPage />);
    const rows = screen.getAllByTestId("submission");
    const pending = rows[1]!;
    expect(within(pending).queryByRole("link")).toBeNull();
    expect(within(pending).queryByRole("button")).toBeNull();
    expect(within(pending).queryByTestId("chevron")).toBeNull();
    expect(within(rows[0]!).getByText("Updated")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Updated")).toBeInTheDocument();
    expect(within(rows[2]!).getAllByRole("button", { name: "Dismiss" }).length).toBeGreaterThan(0);
    expect(within(rows[0]!).getAllByRole("link", { name: "View Plate" })[0]).toHaveAttribute(
      "href",
      "/plate/pnw-lv",
    );
    expect(within(rows[4]!).getAllByRole("link", { name: "View Plate" }).length).toBeGreaterThan(0);
  });
});

describe("ProfilePage", () => {
  it("shows the handle, availability, help, save and sample story", () => {
    render(<ProfilePage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const field = screen.getByLabelText("Handle");
    expect(field).toHaveValue("Traveler1234");
    expect(field).toHaveAccessibleDescription(HANDLE_HELP.trim());
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    expect(screen.getByTestId("sample-story")).toHaveTextContent("Traveler1234");
  });

  it("renders the shared story card for the sample story", () => {
    render(<ProfilePage />);
    const card = screen.getByTestId("sample-story");
    expect(within(card).getByText("Traveler1234")).toBeInTheDocument();
    expect(within(card).getByText("Pacific Northwest love.")).toBeInTheDocument();
    expect(
      within(card).getByText("Saw this plate at a trailhead outside Bend."),
    ).toBeInTheDocument();
    expect(within(card).getByText("My best guess")).toBeInTheDocument();
  });
});
