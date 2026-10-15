import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function Harness({ onAction }: { onAction: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Delete</AlertDialogTrigger>
      <AlertDialogContent className="content-x">
        <AlertDialogHeader className="head-x">
          <AlertDialogTitle className="title-x">Delete story?</AlertDialogTitle>
          <AlertDialogDescription className="desc-x">This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="foot-x">
          <AlertDialogCancel className="cancel-x">Keep</AlertDialogCancel>
          <AlertDialogAction className="action-x" onClick={onAction}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  it("opens, styles its parts, and the action closes it after firing", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dlg = await screen.findByRole("alertdialog", { name: "Delete story?" });
    expect(dlg).toHaveClass("max-w-lg", "content-x");
    expect(dlg).toHaveAccessibleDescription("This cannot be undone.");
    expect(screen.getByText("Delete story?")).toHaveClass("font-semibold", "title-x");
    expect(screen.getByText("This cannot be undone.")).toHaveClass("desc-x");
    expect(screen.getByText("Delete story?").parentElement).toHaveClass("head-x");
    const cancel = screen.getByRole("button", { name: "Keep" });
    expect(cancel).toHaveClass("border-input", "mt-2", "cancel-x");
    expect(cancel.parentElement).toHaveClass("flex-col-reverse", "foot-x");
    const action = screen.getByRole("button", { name: "Confirm" });
    expect(action).toHaveClass("bg-primary", "action-x");
    await user.click(action);
    expect(onAction).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("closes without acting when cancelled", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(await screen.findByRole("button", { name: "Keep" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onAction).not.toHaveBeenCalled();
  });
});
