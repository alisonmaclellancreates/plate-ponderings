import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";

describe("Command", () => {
  it("filters items as the user types and shows the empty state", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Command className="cmd-x" label="Search plates">
        <CommandInput placeholder="Search" className="input-x" />
        <CommandList className="list-x">
          <CommandEmpty>No plates</CommandEmpty>
          <CommandGroup heading="States" className="group-x">
            <CommandItem className="item-x" onSelect={onSelect}>
              Oregon
              <CommandShortcut className="sc-x">⌘O</CommandShortcut>
            </CommandItem>
            <CommandItem>Texas</CommandItem>
          </CommandGroup>
          <CommandSeparator className="sep-x" alwaysRender />
        </CommandList>
      </Command>,
    );
    const input = screen.getByPlaceholderText("Search");
    expect(input).toHaveClass("h-10", "input-x");
    expect(input.closest(".cmd-x")).toHaveClass("bg-popover");
    expect(screen.getByRole("listbox")).toHaveClass("max-h-[300px]", "list-x");
    expect(screen.getByText("States").closest(".group-x")).not.toBeNull();
    expect(screen.getByText("⌘O")).toHaveClass("tracking-widest", "sc-x");
    expect(document.querySelector(".sep-x")).toHaveClass("bg-border");
    expect(screen.getByRole("option", { name: /Oregon/ })).toHaveClass("item-x");

    await user.type(input, "tex");
    await waitFor(() => expect(screen.queryByRole("option", { name: /Oregon/ })).toBeNull());
    expect(screen.getByRole("option", { name: "Texas" })).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "zzz");
    expect(await screen.findByText("No plates")).toHaveClass("py-6");

    await user.clear(input);
    await user.click(await screen.findByRole("option", { name: /Oregon/ }));
    expect(onSelect).toHaveBeenCalledWith("Oregon⌘O");
  });

  it("renders inside a dialog when open", async () => {
    render(
      <CommandDialog open>
        <DialogTitle>Quick search</DialogTitle>
        <DialogDescription>Find a plate</DialogDescription>
        <CommandInput placeholder="Type" />
        <CommandList>
          <CommandItem>Maine</CommandItem>
        </CommandList>
      </CommandDialog>,
    );
    const dlg = await screen.findByRole("dialog", { name: "Quick search" });
    expect(dlg).toHaveClass("p-0");
    expect(screen.getByRole("option", { name: "Maine" })).toBeInTheDocument();
  });
});
