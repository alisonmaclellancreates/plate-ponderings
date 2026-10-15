import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Side = "top" | "bottom" | "left" | "right";

function renderSheet(side?: Side) {
  return render(
    <Sheet defaultOpen>
      <SheetTrigger>Open</SheetTrigger>
      <SheetContent className="sheet-x" {...(side ? { side } : {})}>
        <SheetHeader className="head-x">
          <SheetTitle className="title-x">Filters</SheetTitle>
          <SheetDescription className="desc-x">Narrow the plates</SheetDescription>
        </SheetHeader>
        <SheetFooter className="foot-x">Footer</SheetFooter>
      </SheetContent>
    </Sheet>,
  );
}

describe("Sheet", () => {
  it("defaults to the right side and renders every part", async () => {
    renderSheet();
    const dlg = await screen.findByRole("dialog", { name: "Filters" });
    expect(dlg).toHaveClass("right-0", "border-l", "sheet-x");
    expect(dlg).toHaveAccessibleDescription("Narrow the plates");
    expect(screen.getByText("Filters")).toHaveClass("text-foreground", "title-x");
    expect(screen.getByText("Narrow the plates")).toHaveClass("desc-x");
    expect(screen.getByText("Filters").parentElement).toHaveClass("space-y-2", "head-x");
    expect(screen.getByText("Footer")).toHaveClass("flex-col-reverse", "foot-x");
  });

  it.each([
    ["top", "top-0"],
    ["bottom", "bottom-0"],
    ["left", "left-0"],
    ["right", "right-0"],
  ] as const)("applies the %s side class", async (side, cls) => {
    renderSheet(side);
    expect(await screen.findByRole("dialog")).toHaveClass(cls);
  });

  it("opens from the trigger and closes with the built-in close button", async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Options</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog", { name: "Menu" });
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
