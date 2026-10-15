import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

describe("Tooltip", () => {
  it("shows its text on hover inside a provider", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Info</TooltipTrigger>
          <TooltipContent className="tip-x">Plate meaning</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
    await user.hover(screen.getByRole("button", { name: "Info" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Plate meaning");
    const copies = screen.getAllByText("Plate meaning");
    expect(copies.length).toBeGreaterThanOrEqual(1);
    expect(copies[0]!.closest(".tip-x")).toHaveClass("bg-primary");
  });
});
