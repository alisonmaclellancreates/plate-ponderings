import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";

function Harness({ onSelect }: { onSelect: () => void }) {
  return (
    <Menubar className="bar-x">
      <MenubarMenu>
        <MenubarTrigger className="trig-x">File</MenubarTrigger>
        <MenubarContent className="content-x">
          <MenubarLabel>Plain label</MenubarLabel>
          <MenubarLabel inset>Inset label</MenubarLabel>
          <MenubarSeparator className="sep-x" />
          <MenubarGroup>
            <MenubarItem onSelect={onSelect}>
              New
              <MenubarShortcut className="sc-x">⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem inset>Inset item</MenubarItem>
          </MenubarGroup>
          <MenubarCheckboxItem checked>Autosave</MenubarCheckboxItem>
          <MenubarRadioGroup value="a">
            <MenubarRadioItem value="a">Grid</MenubarRadioItem>
            <MenubarRadioItem value="b">List</MenubarRadioItem>
          </MenubarRadioGroup>
          <MenubarSub>
            <MenubarSubTrigger>Export</MenubarSubTrigger>
            <MenubarPortal>
              <MenubarSubContent className="sub-x">
                <MenubarItem>PDF</MenubarItem>
              </MenubarSubContent>
            </MenubarPortal>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger inset>Inset export</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>Nothing</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

describe("Menubar", () => {
  it("opens a menu from its trigger, renders every part, and fires item selection", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    expect(screen.getByRole("menubar")).toHaveClass("h-9", "bar-x");
    const trig = screen.getByRole("menuitem", { name: "File" });
    expect(trig).toHaveClass("trig-x");
    await user.click(trig);
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("bg-popover", "content-x");
    expect(screen.getByText("Plain label")).not.toHaveClass("pl-8");
    expect(screen.getByText("Inset label")).toHaveClass("pl-8");
    expect(document.querySelector(".sep-x")).toHaveClass("bg-muted");
    expect(screen.getByText("⌘N")).toHaveClass("tracking-widest", "sc-x");
    expect(screen.getByRole("menuitem", { name: "Inset item" })).toHaveClass("pl-8");
    expect(screen.getByRole("menuitem", { name: /New/ })).not.toHaveClass("pl-8");
    const cb = screen.getByRole("menuitemcheckbox", { name: "Autosave" });
    expect(cb.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("menuitemradio", { name: "Grid" }).querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("menuitemradio", { name: "List" }).querySelector("svg")).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Inset export" })).toHaveClass("pl-8");
    expect(screen.getByRole("menuitem", { name: "Export" })).not.toHaveClass("pl-8");
    await user.click(screen.getByRole("menuitem", { name: /New/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("opens a submenu when its sub-trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness onSelect={() => {}} />);
    await user.click(screen.getByRole("menuitem", { name: "File" }));
    await user.click(await screen.findByRole("menuitem", { name: "Export" }));
    const pdf = await screen.findByRole("menuitem", { name: "PDF" });
    expect(pdf.closest(".sub-x")).toHaveClass("bg-popover");
  });
});
