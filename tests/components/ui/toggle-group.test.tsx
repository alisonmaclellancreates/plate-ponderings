import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

describe("ToggleGroup", () => {
  it("passes the group's variant and size to items and toggles selection", async () => {
    const user = userEvent.setup();
    render(
      <ToggleGroup type="single" variant="outline" size="sm" className="grp-x" aria-label="Region">
        <ToggleGroupItem value="us" className="item-x">
          US
        </ToggleGroupItem>
        <ToggleGroupItem value="ca">CA</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Region" })).toHaveClass("gap-1", "grp-x");
    const us = screen.getByRole("radio", { name: "US" });
    expect(us).toHaveClass("border-input", "h-8", "item-x");
    await user.click(us);
    expect(us).toHaveAttribute("data-state", "on");
  });

  it("falls back to the item's own variant and size when the group sets none", () => {
    render(
      <ToggleGroup type="multiple">
        <ToggleGroupItem value="a" variant="outline" size="lg">
          A
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(screen.getByRole("button", { name: "A" })).toHaveClass("border-input", "h-10");
  });
});
