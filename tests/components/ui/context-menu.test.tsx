import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

function Harness({ onSelect }: { onSelect: () => void }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>Right-click the plate</ContextMenuTrigger>
      <ContextMenuContent className="content-x">
        <ContextMenuLabel>Plain label</ContextMenuLabel>
        <ContextMenuLabel inset>Inset label</ContextMenuLabel>
        <ContextMenuSeparator className="sep-x" />
        <ContextMenuGroup>
          <ContextMenuItem onSelect={onSelect}>
            Copy
            <ContextMenuShortcut className="sc-x">⌘C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem inset>Inset item</ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuCheckboxItem checked>Pinned</ContextMenuCheckboxItem>
        <ContextMenuRadioGroup value="a">
          <ContextMenuRadioItem value="a">Newest</ContextMenuRadioItem>
          <ContextMenuRadioItem value="b">Oldest</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
        <ContextMenuSub>
          <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
          <ContextMenuPortal>
            <ContextMenuSubContent className="sub-x">
              <ContextMenuItem>Report</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuPortal>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>Inset more</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Nothing</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}

describe("ContextMenu", () => {
  it("opens on right-click, renders every part, and fires item selection", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.contextMenu(screen.getByText("Right-click the plate"));
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("bg-popover", "content-x");
    expect(screen.getByText("Plain label")).not.toHaveClass("pl-8");
    expect(screen.getByText("Inset label")).toHaveClass("pl-8");
    expect(document.querySelector(".sep-x")).toHaveClass("bg-border");
    expect(screen.getByText("⌘C")).toHaveClass("tracking-widest", "sc-x");
    expect(screen.getByRole("menuitem", { name: "Inset item" })).toHaveClass("pl-8");
    expect(screen.getByRole("menuitem", { name: /Copy/ })).not.toHaveClass("pl-8");
    const cb = screen.getByRole("menuitemcheckbox", { name: "Pinned" });
    expect(cb).toHaveAttribute("aria-checked", "true");
    expect(cb.querySelector("svg")).not.toBeNull();
    expect(
      screen.getByRole("menuitemradio", { name: "Newest" }).querySelector("svg"),
    ).not.toBeNull();
    expect(screen.getByRole("menuitemradio", { name: "Oldest" }).querySelector("svg")).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Inset more" })).toHaveClass("pl-8");
    expect(screen.getByRole("menuitem", { name: "More" })).not.toHaveClass("pl-8");
    await user.click(screen.getByRole("menuitem", { name: /Copy/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("opens a submenu when its sub-trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness onSelect={() => {}} />);
    fireEvent.contextMenu(screen.getByText("Right-click the plate"));
    await user.click(await screen.findByRole("menuitem", { name: "More" }));
    const report = await screen.findByRole("menuitem", { name: "Report" });
    expect(report.closest(".sub-x")).toHaveClass("shadow-lg");
  });
});
