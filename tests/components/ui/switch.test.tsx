import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "@/components/ui/switch";

describe("Switch", () => {
  it("flips on click", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Public" className="sw-x" />);
    const sw = screen.getByRole("switch", { name: "Public" });
    expect(sw).toHaveClass("sw-x");
    expect(sw).toHaveAttribute("data-state", "unchecked");
    await user.click(sw);
    expect(sw).toHaveAttribute("data-state", "checked");
    expect(sw).toBeChecked();
  });
});
