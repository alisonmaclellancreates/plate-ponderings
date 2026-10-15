import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

describe("Dialog", () => {
  it("opens from its trigger into a portal and closes with the built-in close button", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Dialog>
        <DialogTrigger>Open plate</DialogTrigger>
        <DialogContent className="content-x">
          <DialogHeader className="head-x">
            <DialogTitle className="title-x">Plate story</DialogTitle>
            <DialogDescription className="desc-x">What it means</DialogDescription>
          </DialogHeader>
          <DialogFooter className="foot-x">
            <DialogClose>Done</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Open plate" }));
    const dialog = await screen.findByRole("dialog", { name: "Plate story" });
    expect(container.contains(dialog)).toBe(false);
    expect(dialog).toHaveClass("bg-background", "content-x");
    expect(dialog).toHaveAccessibleDescription("What it means");
    expect(screen.getByText("Plate story")).toHaveClass("text-lg", "title-x");
    expect(screen.getByText("What it means")).toHaveClass("text-muted-foreground", "desc-x");
    expect(screen.getByText("Plate story").parentElement).toHaveClass("flex-col", "head-x");
    expect(screen.getByRole("button", { name: "Done" }).parentElement).toHaveClass(
      "flex-col-reverse",
      "foot-x",
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
