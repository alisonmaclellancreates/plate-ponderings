import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const m = vi.hoisted(() => ({
  account: null as null | { handle: string; isDemo: boolean; isAdmin: boolean },
  navigate: vi.fn(),
  invalidate: vi.fn(),
  track: vi.fn(),
  heart: vi.fn(),
  report: vi.fn(),
  block: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/lib/account-auth", () => ({ useAccountAuth: () => ({ account: m.account }) }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => m.navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: m.invalidate }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/analytics", () => ({ track: m.track }));
vi.mock("@/lib/story-actions.functions", () => ({
  toggleHeart: m.heart,
  reportStory: m.report,
  blockAuthor: m.block,
  deleteMyStory: m.remove,
}));

import {
  ACTION_ERROR,
  HeartButton,
  REPORT_ALREADY,
  REPORT_SENT,
  StoryMenuActions,
} from "@/components/site/StoryActions";
import { DEMO_MESSAGE } from "@/lib/account-rules";

const story = { id: "s1", handle: "maplegirl", hearts: 2, hearted: false, isOwn: false };
const member = { handle: "Traveler1234", isDemo: false, isAdmin: false };

beforeEach(() => {
  vi.clearAllMocks();
  m.account = member;
});

describe("HeartButton", () => {
  it("sends signed-out visitors to sign in with a return to this plate", async () => {
    m.account = null;
    render(<HeartButton story={story} plateId="p1" />);
    await userEvent.click(screen.getByRole("button", { pressed: false }));
    expect(m.navigate).toHaveBeenCalledWith({
      to: "/sign-in",
      search: { returnTo: "/plate/p1" },
    });
    expect(m.heart).not.toHaveBeenCalled();
  });
  it("hearts, then removes the heart on a second tap", async () => {
    m.heart.mockResolvedValue({ outcome: "done" });
    render(<HeartButton story={story} plateId="p1" />);
    const button = screen.getByRole("button");
    await userEvent.click(button);
    expect(m.heart).toHaveBeenLastCalledWith({ data: { storyId: "s1", hearted: true } });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveTextContent("3hearts");
    expect(m.track).toHaveBeenLastCalledWith("story_hearted", {});
    expect(m.invalidate).toHaveBeenCalledWith({ queryKey: ["plate-stories", "p1"] });
    await userEvent.click(button);
    expect(m.heart).toHaveBeenLastCalledWith({ data: { storyId: "s1", hearted: false } });
    expect(button).toHaveTextContent("2hearts");
    expect(m.track).toHaveBeenLastCalledWith("story_unhearted", {});
  });
  it("says heart in the singular", () => {
    render(<HeartButton story={{ ...story, hearts: 1, hearted: true }} plateId="p1" />);
    expect(screen.getByRole("button", { pressed: true })).toHaveTextContent("1heart");
  });
  it.each([
    ["demo", () => m.heart.mockResolvedValue({ outcome: "demo", message: DEMO_MESSAGE }), DEMO_MESSAGE],
    ["error", () => m.heart.mockResolvedValue({ outcome: "error" }), ACTION_ERROR],
    ["throw", () => m.heart.mockRejectedValue(new Error("x")), ACTION_ERROR],
  ])("shows a message and keeps the count on %s", async (_l, arrange, text) => {
    arrange();
    render(<HeartButton story={story} plateId="p1" />);
    await userEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("status")).toHaveTextContent(text);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    expect(m.track).not.toHaveBeenCalled();
  });
});

const openMenu = () =>
  userEvent.click(screen.getByRole("button", { name: "More options for maplegirl's story" }));

describe("StoryMenuActions", () => {
  it("shows no menu to signed-out visitors", () => {
    m.account = null;
    const { container } = render(<StoryMenuActions story={story} plateId="p1" />);
    expect(container).toBeEmptyDOMElement();
  });
  it("offers Report and Block on someone else's story, and toggles closed", async () => {
    render(<StoryMenuActions story={story} plateId="p1" />);
    await openMenu();
    expect(screen.getByRole("menuitem", { name: "Report story" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Block maplegirl" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Delete my story" })).toBeNull();
    await openMenu();
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("offers only Delete on your own story", async () => {
    render(<StoryMenuActions story={{ ...story, isOwn: true }} plateId="p1" />);
    await openMenu();
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Delete my story",
    ]);
  });
  it("blocks the author and refreshes stories and summary", async () => {
    m.block.mockResolvedValue({ outcome: "done" });
    render(<StoryMenuActions story={story} plateId="p1" />);
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Block maplegirl" }));
    expect(m.block).toHaveBeenCalledWith({ data: { storyId: "s1" } });
    expect(m.track).toHaveBeenCalledWith("user_blocked", {});
    expect(m.invalidate).toHaveBeenCalledWith({ queryKey: ["plate-stories", "p1"] });
    expect(m.invalidate).toHaveBeenCalledWith({ queryKey: ["plate-summary", "p1"] });
  });
  it("reports with a reason key, sending the reason only", async () => {
    m.report.mockResolvedValue({ outcome: "done" });
    render(<StoryMenuActions story={story} plateId="p1" />);
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Report story" }));
    await userEvent.click(screen.getByLabelText("Hurtful or harassing"));
    await userEvent.type(screen.getByLabelText("Optional note"), "rude");
    await userEvent.click(screen.getByRole("button", { name: "Send Report" }));
    expect(m.report).toHaveBeenCalledWith({
      data: { storyId: "s1", reason: "harassment", note: "rude" },
    });
    expect(m.track).toHaveBeenCalledWith("story_reported", { reason: "harassment" });
    expect(await screen.findByRole("status")).toHaveTextContent(REPORT_SENT);
  });
  it("says when you've already reported, and Cancel closes the dialog", async () => {
    m.report.mockResolvedValue({ outcome: "already" });
    render(<StoryMenuActions story={story} plateId="p1" />);
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Report story" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("report-dialog")).toBeNull();
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Report story" }));
    await userEvent.click(screen.getByLabelText("Spam"));
    await userEvent.click(screen.getByRole("button", { name: "Send Report" }));
    expect(await screen.findByRole("status")).toHaveTextContent(REPORT_ALREADY);
    expect(m.track).not.toHaveBeenCalled();
  });
  it("deletes your story after confirming, and Keep Story closes", async () => {
    m.remove.mockResolvedValue({ outcome: "done" });
    render(<StoryMenuActions story={{ ...story, isOwn: true }} plateId="p1" />);
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete my story" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep Story" }));
    expect(m.remove).not.toHaveBeenCalled();
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete my story" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete Story" }));
    expect(m.remove).toHaveBeenCalledWith({ data: { storyId: "s1" } });
    expect(m.track).toHaveBeenCalledWith("story_deleted", {});
    await waitFor(() => expect(m.invalidate).toHaveBeenCalledTimes(2));
  });
  it.each([
    [{ outcome: "demo", message: DEMO_MESSAGE }, DEMO_MESSAGE],
    [{ outcome: "demo" }, ""],
    [{ outcome: "error" }, ACTION_ERROR],
    [{ outcome: "validation" }, ACTION_ERROR],
  ])("refuses with the right message for %o", async (result, text) => {
    m.block.mockResolvedValue(result);
    render(<StoryMenuActions story={story} plateId="p1" />);
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Block maplegirl" }));
    await waitFor(() => expect(m.block).toHaveBeenCalled());
    if (text) expect(await screen.findByRole("status")).toHaveTextContent(text);
    else expect(screen.queryByRole("status")).toBeNull();
    expect(m.track).not.toHaveBeenCalled();
  });
  it("shows the error message when an action throws", async () => {
    m.block.mockRejectedValue(new Error("x"));
    render(<StoryMenuActions story={story} plateId="p1" />);
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Block maplegirl" }));
    expect(await screen.findByRole("status")).toHaveTextContent(ACTION_ERROR);
  });
  it("shows the demo account the menu, refusing each action with the demo message", async () => {
    m.account = { ...member, isDemo: true };
    m.remove.mockResolvedValue({ outcome: "demo", message: DEMO_MESSAGE });
    render(<StoryMenuActions story={{ ...story, isOwn: true }} plateId="p1" />);
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete my story" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete Story" }));
    expect(await screen.findByRole("status")).toHaveTextContent(DEMO_MESSAGE);
  });
});
