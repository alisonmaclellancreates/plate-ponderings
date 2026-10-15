import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

describe("HoverCard", () => {
  it("shows its content on hover with default alignment", async () => {
    const user = userEvent.setup();
    render(
      <HoverCard openDelay={0}>
        <HoverCardTrigger href="#p">LUV2SK8</HoverCardTrigger>
        <HoverCardContent className="hc-x">Loves skating</HoverCardContent>
      </HoverCard>,
    );
    expect(screen.queryByText("Loves skating")).toBeNull();
    await user.hover(screen.getByText("LUV2SK8"));
    const content = await screen.findByText("Loves skating");
    expect(content).toHaveClass("w-64", "hc-x");
    expect(content).toHaveAttribute("data-align", "center");
  });

  it("honours a custom align", async () => {
    render(
      <HoverCard defaultOpen>
        <HoverCardTrigger href="#p">Plate</HoverCardTrigger>
        <HoverCardContent align="end" sideOffset={8}>
          End
        </HoverCardContent>
      </HoverCard>,
    );
    expect(await screen.findByText("End")).toHaveAttribute("data-align", "end");
  });
});
