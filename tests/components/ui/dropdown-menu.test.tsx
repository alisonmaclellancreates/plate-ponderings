import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function Harness({ onSelect }: { onSelect: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent className="content-x">
        <DropdownMenuLabel>Plain label</DropdownMenuLabel>
        <DropdownMenuLabel inset>Inset label</DropdownMenuLabel>
        <DropdownMenuSeparator className="sep-x" />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onSelect}>
            Share
            <DropdownMenuShortcut className="sc-x">⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem inset>Inset item</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuCheckboxItem checked className="cb-x">
          Show map
        </DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup value="us">
          <DropdownMenuRadioItem value="us" className="radio-x">
            US
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="ca">Canada</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="sub-x">
              <DropdownMenuItem>Report</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger inset>Inset more</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Nothing</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("DropdownMenu", () => {
  it("opens from its trigger, renders every part, and fires item selection", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "Actions" }));
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("bg-popover", "content-x");
    expect(screen.getByText("Plain label")).not.toHaveClass("pl-8");
    expect(screen.getByText("Inset label")).toHaveClass("pl-8");
    expect(document.querySelector(".sep-x")).toHaveClass("bg-muted");
    expect(screen.getByText("⌘S")).toHaveClass("tracking-widest", "sc-x");
    expect(screen.getByRole("menuitem", { name: "Inset item" })).toHaveClass("pl-8");
    expect(screen.getByRole("menuitem", { name: /Share/ })).not.toHaveClass("pl-8");
    const cb = screen.getByRole("menuitemcheckbox", { name: "Show map" });
    expect(cb).toHaveAttribute("aria-checked", "true");
    expect(cb.querySelector("svg")).not.toBeNull();
    const us = screen.getByRole("menuitemradio", { name: "US" });
    expect(us).toHaveAttribute("aria-checked", "true");
    expect(us.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("menuitemradio", { name: "Canada" }).querySelector("svg")).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Inset more" })).toHaveClass("pl-8");
    expect(screen.getByRole("menuitem", { name: "More" })).not.toHaveClass("pl-8");
    await user.click(screen.getByRole("menuitem", { name: /Share/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("opens a submenu when its sub-trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness onSelect={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "More" }));
    const report = await screen.findByRole("menuitem", { name: "Report" });
    expect(report.closest(".sub-x")).toHaveClass("shadow-lg");
  });
});
