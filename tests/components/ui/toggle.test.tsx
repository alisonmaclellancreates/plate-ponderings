import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "@/components/ui/toggle";

describe("Toggle", () => {
  it("presses on click with a non-default variant and size", async () => {
    const user = userEvent.setup();
    render(<Toggle aria-label="Bold" variant="outline" size="lg" className="tg-x" />);
    const t = screen.getByRole("button", { name: "Bold" });
    expect(t).toHaveClass("border-input", "h-10", "tg-x");
    expect(t).toHaveAttribute("aria-pressed", "false");
    await user.click(t);
    expect(t).toHaveAttribute("aria-pressed", "true");
    expect(t).toHaveAttribute("data-state", "on");
  });
});
