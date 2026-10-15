import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

describe("Accordion", () => {
  it("opens an item when its trigger is clicked and merges classNames", async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a" className="item-x" data-testid="item">
          <AccordionTrigger className="trigger-x">What is a vanity plate?</AccordionTrigger>
          <AccordionContent className="content-x">A custom plate.</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const trigger = screen.getByRole("button", { name: "What is a vanity plate?" });
    expect(screen.getByTestId("item")).toHaveClass("border-b", "item-x");
    expect(trigger).toHaveClass("trigger-x");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger.querySelector("svg")).not.toBeNull();
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const text = screen.getByText("A custom plate.");
    expect(text).toHaveClass("pb-4", "content-x");
    expect(screen.getByRole("region")).toHaveAttribute("data-state", "open");
  });
});
