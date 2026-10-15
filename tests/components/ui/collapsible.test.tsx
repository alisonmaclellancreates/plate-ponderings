import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

describe("Collapsible", () => {
  it("reveals content when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Collapsible>
        <CollapsibleTrigger>More</CollapsibleTrigger>
        <CollapsibleContent>Hidden story</CollapsibleContent>
      </Collapsible>,
    );
    expect(screen.queryByText("Hidden story")).toBeNull();
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByText("Hidden story")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "true");
  });
});
