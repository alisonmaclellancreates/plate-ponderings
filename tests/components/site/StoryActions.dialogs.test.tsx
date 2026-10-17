import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/account-auth", () => ({
  useAccountAuth: () => ({ account: { handle: "Traveler1234" } }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/story-actions.functions", () => ({
  toggleHeart: vi.fn(),
  reportStory: vi.fn(),
  blockAuthor: vi.fn(),
  deleteMyStory: vi.fn(),
}));
vi.mock("@/components/site/StoryMenu", () => {
  // Exercise the controlled-dialog contract in both directions. Real Radix
  // dismissal is tested in StoryActions.test.tsx; these dialogs have no trigger.
  const dialog = (name: string) =>
    function ControlledDialog({
      open,
      onOpenChange,
    }: {
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }) {
      return (
        <button onClick={() => onOpenChange(!open)}>
          {name} {open ? "close" : "open"}
        </button>
      );
    };
  return {
    StoryMenuList: () => null,
    ReportDialog: dialog("Report"),
    DeleteStoryDialog: dialog("Delete"),
  };
});

import { StoryMenuActions } from "@/components/site/StoryActions";

describe("story controlled dialogs", () => {
  it.each(["Report", "Delete"])(
    "opens and closes %s through onOpenChange and returns focus",
    (name) => {
      render(
        <StoryMenuActions
          plateId="p1"
          story={{
            id: "s1",
            handle: "maplegirl",
            hearts: 0,
            hearted: false,
            isOwn: name === "Delete",
          }}
        />,
      );
      const more = screen.getByRole("button", { name: "More options for maplegirl's story" });
      more.focus();
      fireEvent.click(screen.getByRole("button", { name: `${name} open` }));
      const close = screen.getByRole("button", { name: `${name} close` });
      close.focus();
      fireEvent.click(close);
      expect(screen.getByRole("button", { name: `${name} open` })).toBeInTheDocument();
      expect(more).toHaveFocus();
    },
  );
});
