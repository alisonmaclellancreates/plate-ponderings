import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

describe("Popover", () => {
  it("opens into a portal from its trigger with default alignment", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Popover>
        <PopoverAnchor>
          <span>anchor</span>
        </PopoverAnchor>
        <PopoverTrigger>Details</PopoverTrigger>
        <PopoverContent className="pop-x">Plate info</PopoverContent>
      </Popover>,
    );
    expect(screen.queryByText("Plate info")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Details" }));
    const content = await screen.findByText("Plate info");
    expect(container.contains(content)).toBe(false);
    expect(content).toHaveClass("w-72", "pop-x");
    expect(content).toHaveAttribute("data-align", "center");
  });

  it("honours a custom align", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent align="start" sideOffset={10}>
          Start
        </PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByText("Start")).toHaveAttribute("data-align", "start");
  });
});
