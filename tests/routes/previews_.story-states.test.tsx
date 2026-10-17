import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType, ReactNode } from "react";

const m = vi.hoisted(() => ({
  getPlate: vi.fn(),
  getPlateStories: vi.fn(),
  addStory: vi.fn(),
  track: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => o,
  Link: ({ children, className }: { children: ReactNode; className?: string }) => (
    <a className={className}>{children}</a>
  ),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryFn, enabled }: { queryFn: () => unknown; enabled?: boolean }) => {
    if (enabled !== false) queryFn();
    return { data: undefined };
  },
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/plates.functions", () => ({ getPlate: m.getPlate }));
vi.mock("@/lib/stories.functions", () => ({
  addStory: m.addStory,
  getPlateStories: m.getPlateStories,
}));
vi.mock("@/lib/account-auth", () => ({
  useAccountAuth: () => ({ account: { handle: "Traveler4821", isDemo: false, isAdmin: false } }),
}));
vi.mock("@/lib/analytics", () => ({ track: m.track }));

import { Route as ErrorRoute } from "@/routes/previews_.story-error";
import { Route as PausedRoute } from "@/routes/previews_.story-rate-limited";
import { RATE_LIMIT_MESSAGE } from "@/lib/account-rules";
import { SAMPLE_STORY } from "@/lib/story-form";

type R = { component: ComponentType; head: () => { meta: Record<string, string>[] } };

beforeEach(() => vi.clearAllMocks());

describe.each([
  [
    "error",
    ErrorRoute as unknown as R,
    "Hmm... something went wrong.",
    "We couldn't submit your story right now. Your words are still here. Please try again.",
    "Story form, error preview | What the Plate?",
  ],
  [
    "rate limit",
    PausedRoute as unknown as R,
    "Let's pause a moment.",
    RATE_LIMIT_MESSAGE,
    "Story form, paused preview | What the Plate?",
  ],
])("%s preview route", (_name, route, heading, message, title) => {
  it("shows its notice on a preview plate with the draft kept", () => {
    const Page = route.component;
    render(<Page />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(heading);
    expect(status).toHaveTextContent(message);
    expect(screen.getByText("PNW LV", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByLabelText(/What do you think it means/)).toHaveValue(SAMPLE_STORY.meaning);
    expect(screen.getByRole("textbox", { name: /Tell us more/ })).toHaveValue(SAMPLE_STORY.more);
  });

  it("reads and writes nothing, even through Submit Story", async () => {
    const user = userEvent.setup();
    const Page = route.component;
    render(<Page />);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Continue without a photo" }));
    await user.click(screen.getByRole("button", { name: "Submit Story" }));
    expect(m.getPlate).not.toHaveBeenCalled();
    expect(m.getPlateStories).not.toHaveBeenCalled();
    expect(m.addStory).not.toHaveBeenCalled();
    expect(m.track).not.toHaveBeenCalled();
  });

  it("has its own title", () => {
    const meta = route.head().meta;
    expect(meta.find((x) => "title" in x)?.["title"]).toBe(title);
    expect(meta.find((x) => x["property"] === "og:title")?.["content"]).toBe(title);
  });
});
