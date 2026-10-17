import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const m = vi.hoisted(() => ({
  summary: null as unknown,
  getPlateSummary: vi.fn(),
  track: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, className }: { children: ReactNode; className?: string }) => (
    <a className={className}>{children}</a>
  ),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {} } }));
vi.mock("@/lib/account-auth", () => ({ useAccountAuth: () => ({ account: null }) }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey, queryFn }: { queryKey: string[]; queryFn: () => unknown }) => {
    queryFn();
    return { data: queryKey[0] === "plate-summary" ? m.summary : { stories: [], total: 0, pending: [], storyCount: 2, ownerHandle: null, hasOwnerStory: false } };
  },
}));
vi.mock("@/lib/stories.functions", () => ({ getPlateStories: vi.fn(), STORY_PAGE_SIZE: 5 }));
vi.mock("@/lib/summaries.functions", () => ({ getPlateSummary: m.getPlateSummary }));
vi.mock("@/lib/analytics", () => ({ track: m.track }));

import { RealPlateDetail } from "@/components/site/PlateDetail";

const plate = { id: "p1", jurisdiction: "Washington", text: "B7K 2L9" };
const v = (n: number, consensus = "mixed", storyCount = n) => ({
  version: n,
  text: `Summary text ${n}`,
  consensus,
  storyCount,
  generatedAt: `2026-10-${String(n).padStart(2, "0")}T12:00:00Z`,
});

beforeEach(() => {
  vi.clearAllMocks();
  m.summary = null;
});

function panel() {
  return screen.getByRole("region", { name: "The Story So Far" });
}

describe("real summary panel", () => {
  it("asks for this plate's summary", () => {
    render(<RealPlateDetail plate={plate} />);
    expect(m.getPlateSummary).toHaveBeenCalledWith({ data: { plateId: "p1" } });
  });

  it("shows no panel when there is no visible version and no catching up", () => {
    m.summary = { current: null, earlier: [], catchingUp: false };
    render(<RealPlateDetail plate={plate} />);
    expect(screen.queryByRole("region", { name: "The Story So Far" })).toBeNull();
    expect(screen.getByText("What do you think this plate means?")).toBeTruthy();
  });

  it("shows the newest version with its label, stored count and date, and no history when there is none", () => {
    m.summary = { current: v(9, "agree", 4), earlier: [], catchingUp: false };
    render(<RealPlateDetail plate={plate} />);
    const p = within(panel());
    expect(p.getByText("Summary text 9")).toBeTruthy();
    expect(p.getByText("Largely agree")).toBeTruthy();
    expect(p.getByText(/AI-generated summary · Based on 4 stories · Updated Oct 9, 2026/)).toBeTruthy();
    expect(p.queryByRole("button", { name: /Earlier summaries/ })).toBeNull();
    expect(p.queryByRole("status")).toBeNull();
  });

  it("shows only the catching-up note when stories exist but no version is visible", () => {
    m.summary = { current: null, earlier: [], catchingUp: true };
    render(<RealPlateDetail plate={plate} />);
    const p = within(panel());
    expect(p.getByRole("status").textContent).toBe(
      "New stories have arrived. The Story So Far is catching up.",
    );
    expect(p.queryByText(/AI-generated summary/)).toBeNull();
  });

  it("shows the catching-up note inside the panel alongside the current version", () => {
    m.summary = { current: v(5), earlier: [], catchingUp: true };
    render(<RealPlateDetail plate={plate} />);
    expect(within(panel()).getByRole("status")).toBeTruthy();
    expect(within(panel()).getByText("Summary text 5")).toBeTruthy();
  });

  it("counts earlier versions only, lists three newest first, then shows more", async () => {
    const user = userEvent.setup();
    m.summary = {
      current: v(9),
      earlier: [v(8, "differ"), v(7), v(6), v(5), v(4)],
      catchingUp: false,
    };
    render(<RealPlateDetail plate={plate} />);
    await user.click(screen.getByRole("button", { name: "Earlier summaries (5)" }));
    expect(m.track).toHaveBeenCalledWith("summary_history_opened", { versions_shown: 3 });
    const list = document.getElementById("earlier-summaries")!;
    const items = within(list);
    expect(items.getAllByRole("listitem").map((li) => li.textContent?.match(/Oct \d+/)?.[0])).toEqual([
      "Oct 8",
      "Oct 7",
      "Oct 6",
    ]);
    expect(items.getByText("Opinions differ")).toBeTruthy();
    expect(screen.queryByText("Summary text 8")).toBeNull();
    await user.click(items.getAllByRole("button", { name: "Read summary" })[0]!);
    expect(screen.getByText("Summary text 8")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Show more history" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Show more history" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Earlier summaries (5)" }));
    expect(m.track).toHaveBeenCalledTimes(1);
  });

  it("reports the number actually shown when history is short", async () => {
    const user = userEvent.setup();
    m.summary = { current: v(9), earlier: [v(3)], catchingUp: false };
    render(<RealPlateDetail plate={plate} />);
    await user.click(screen.getByRole("button", { name: "Earlier summaries (1)" }));
    expect(m.track).toHaveBeenCalledWith("summary_history_opened", { versions_shown: 1 });
    expect(screen.queryByRole("button", { name: "Show more history" })).toBeNull();
  });
});
