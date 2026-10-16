import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

function Harness(props: { shouldScaleBackground?: boolean }) {
  return (
    <Drawer {...props}>
      <DrawerTrigger>Open drawer</DrawerTrigger>
      <DrawerContent className="content-x">
        <DrawerHeader className="head-x">
          <DrawerTitle className="title-x">Share a story</DrawerTitle>
          <DrawerDescription className="desc-x">Tell us what it means</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="foot-x">
          <DrawerClose>Cancel</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

describe("Drawer", () => {
  it("opens from its trigger with the default background scaling and renders every part", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open drawer" }));
    const dlg = await screen.findByRole("dialog", { name: "Share a story" });
    expect(dlg).toHaveClass("rounded-t-[10px]", "content-x");
    expect(dlg).toHaveAccessibleDescription("Tell us what it means");
    expect(screen.getByText("Share a story")).toHaveClass("text-lg", "title-x");
    expect(screen.getByText("Tell us what it means")).toHaveClass("desc-x");
    expect(screen.getByText("Share a story").parentElement).toHaveClass("grid", "head-x");
    expect(screen.getByRole("button", { name: "Cancel" }).parentElement).toHaveClass(
      "mt-auto",
      "foot-x",
    );
    expect(document.querySelector("[data-vaul-overlay]")).toHaveClass("bg-black/80");
  });

  it("opens with background scaling turned off", async () => {
    const user = userEvent.setup();
    render(<Harness shouldScaleBackground={false} />);
    await user.click(screen.getByRole("button", { name: "Open drawer" }));
    expect(await screen.findByRole("dialog", { name: "Share a story" })).toBeInTheDocument();
  });
});
