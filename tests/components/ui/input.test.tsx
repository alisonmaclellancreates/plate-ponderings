import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/input";

describe("Input", () => {
  it("accepts typing, passes type through and merges className", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Plate" type="search" className="in-x" />);
    const input = screen.getByRole("searchbox", { name: "Plate" });
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveClass("in-x");
    await user.type(input, "L8R G8R");
    expect(input).toHaveValue("L8R G8R");
  });
});
