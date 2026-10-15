import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

describe("RadioGroup", () => {
  it("selects an item on click", async () => {
    const user = userEvent.setup();
    render(
      <RadioGroup aria-label="Country" className="rg-x" defaultValue="us">
        <RadioGroupItem value="us" aria-label="US" />
        <RadioGroupItem value="ca" aria-label="Canada" className="item-x" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Country" })).toHaveClass("grid", "rg-x");
    const ca = screen.getByRole("radio", { name: "Canada" });
    expect(ca).toHaveClass("item-x");
    expect(ca).not.toBeChecked();
    expect(ca.querySelector("svg")).toBeNull();
    await user.click(ca);
    expect(ca).toBeChecked();
    expect(ca.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("radio", { name: "US" })).not.toBeChecked();
  });
});
