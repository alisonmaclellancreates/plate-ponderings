import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

import { REPORT_REASONS, StoryMenuPage } from "@/components/site/StoryMenu";

describe("StoryMenuPage", () => {
  it("shows the other person's menu with Report story and Block maplegirl", () => {
    render(<StoryMenuPage />);
    const menu = within(screen.getByTestId("other-menu"));
    expect(menu.getByRole("menuitem", { name: "Report story" })).toBeTruthy();
    expect(menu.getByRole("menuitem", { name: "Block maplegirl" })).toBeTruthy();
  });

  it("shows the signed-in person's menu with Delete my story", () => {
    render(<StoryMenuPage />);
    const menu = within(screen.getByTestId("own-menu"));
    expect(menu.getByRole("menuitem", { name: "Delete my story" })).toBeTruthy();
  });

  it("shows the report dialog with every reason and a live note counter", () => {
    render(<StoryMenuPage />);
    fireEvent.click(
      within(screen.getByTestId("other-menu")).getByRole("menuitem", { name: "Report story" }),
    );
    const dialog = within(screen.getByTestId("report-dialog"));
    expect(dialog.getByText("Why are you reporting this story?")).toBeTruthy();
    for (const reason of REPORT_REASONS)
      expect(dialog.getByRole("radio", { name: reason })).toBeTruthy();
    expect(dialog.getByText("0/200")).toBeTruthy();
    fireEvent.change(dialog.getByLabelText("Optional note"), { target: { value: "Spammy" } });
    expect(dialog.getByText("6/200")).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Send Report" })).toBeTruthy();
  });

  it("shows the delete confirmation with both actions", () => {
    render(<StoryMenuPage />);
    fireEvent.click(
      within(screen.getByTestId("own-menu")).getByRole("menuitem", { name: "Delete my story" }),
    );
    const dialog = within(screen.getByTestId("delete-story-dialog"));
    expect(dialog.getByText("Delete your story?")).toBeTruthy();
    expect(
      dialog.getByText(
        "Your story will no longer appear on this plate. This also removes its hearts and may change The Story So Far.",
      ),
    ).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Keep Story" })).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Delete Story" })).toBeTruthy();
  });
});
