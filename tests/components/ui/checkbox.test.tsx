import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "@/components/ui/checkbox";

describe("Checkbox", () => {
  it("toggles checked state on click and shows the indicator", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Agree" className="cb-x" />);
    const cb = screen.getByRole("checkbox", { name: "Agree" });
    expect(cb).toHaveClass("cb-x");
    expect(cb).toHaveAttribute("data-state", "unchecked");
    expect(cb.querySelector("svg")).toBeNull();
    await user.click(cb);
    expect(cb).toHaveAttribute("data-state", "checked");
    expect(cb).toBeChecked();
    expect(cb.querySelector("svg")).not.toBeNull();
  });
});
