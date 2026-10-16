import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
      className={className}
      href={params ? to.replace(/\$(\w+)/, (_, k: string) => params[k] ?? "") : to}
    >
      {children}
    </a>
  ),
}));

import { StoryStepPage } from "@/components/site/AddStory";
import { STORY_STEPS, type StoryStep } from "@/lib/story-form";

describe("Add a story previews", () => {
  it("every step has exactly one h1", () => {
    for (const step of Object.keys(STORY_STEPS) as StoryStep[]) {
      const { unmount } = render(<StoryStepPage step={step} />);
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      unmount();
    }
  });

  it("step 1 has a four-radio group, checked by default and switchable", async () => {
    const user = userEvent.setup();
    render(<StoryStepPage step="1" />);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("radio", { name: "It's my plate" })).toBeChecked();
    expect(screen.getByText("0/80")).toBeInTheDocument();
    expect(screen.getByText("0/500")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/What do you think it means/), "Hello");
    expect(screen.getByText("5/80")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "My best guess" }));
    expect(screen.getByRole("radio", { name: "My best guess" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "It's my plate" })).not.toBeChecked();
    expect(screen.queryByText(/already said this is their plate/)).toBeNull();
  });

  it("owner-exists shows the calm note", () => {
    render(<StoryStepPage step="1-owner-exists" />);
    expect(screen.getByText(/Yours will appear alongside theirs/)).toBeInTheDocument();
  });

  it("rejected keeps the words and explains", () => {
    render(<StoryStepPage step="rejected" />);
    expect(screen.getByRole("status")).toHaveTextContent("We couldn't add this story.");
    expect(screen.getByLabelText(/What do you think it means/)).toHaveValue(
      "Pacific Northwest love.",
    );
  });

  it("photo editors open as dialogs over step 2", () => {
    const { unmount } = render(<StoryStepPage step="2-adjust" />);
    expect(screen.getByRole("dialog", { name: "Adjust the plate area" })).toBeInTheDocument();
    expect(screen.getByText("Choose a photo or drag and drop")).toBeInTheDocument();
    unmount();
    render(<StoryStepPage step="2-review" />);
    expect(screen.getByRole("dialog", { name: "Review your photo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Use This Photo" })).toHaveClass("brand-btn-coral");
  });

  it("review shows labelled answers and outcomes have their buttons", () => {
    const { unmount } = render(<StoryStepPage step="3" />);
    expect(screen.getByText("How I know")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Submit Story" })).toHaveAttribute(
      "href",
      "/story/done",
    );
    unmount();
    const d = render(<StoryStepPage step="done" />);
    expect(screen.getByRole("link", { name: "View This Plate" })).toHaveAttribute(
      "href",
      "/plate/pnw-lv",
    );
    d.unmount();
    render(<StoryStepPage step="checking" />);
    expect(screen.getByRole("link", { name: "Go to Your Submissions" })).toHaveAttribute(
      "href",
      "/submissions",
    );
  });

  it("location hint is visible and describes the text area", () => {
    render(<StoryStepPage step="1" />);
    const hint = screen.getByText("Keep places general, like near Seattle");
    expect(hint).toBeVisible();
    const more = screen.getByRole("textbox", { name: /Tell us more/ });
    expect(more.getAttribute("aria-describedby")?.split(" ")).toEqual(
      expect.arrayContaining([hint.id, "story-more-count"]),
    );
    expect(more).not.toHaveAttribute("placeholder");
  });

  it("typing in Tell us more moves its counter from 0/500", async () => {
    const user = userEvent.setup();
    render(<StoryStepPage step="1" />);
    const more = screen.getByRole("textbox", { name: /Tell us more/ });
    expect(screen.getByText("0/500")).toBeInTheDocument();
    await user.type(more, "Near Seattle");
    expect(screen.getByText("12/500")).toBeInTheDocument();
    expect(screen.queryByText("0/500")).toBeNull();
  });

  it("Cancel on step 1 opens the PNW LV preview", () => {
    render(<StoryStepPage step="1" />);
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/plate/pnw-lv");
  });
});
