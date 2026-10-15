import { render, screen } from "@testing-library/react";
import { Slider } from "@/components/ui/slider";

describe("Slider", () => {
  it("renders a thumb reflecting its value and merges className", () => {
    const { container } = render(<Slider defaultValue={[30]} max={100} className="sl-x" aria-label="Rating" />);
    expect(container.firstElementChild).toHaveClass("touch-none", "sl-x");
    const thumb = screen.getByRole("slider");
    expect(thumb).toHaveAttribute("aria-valuenow", "30");
    expect(thumb).toHaveAttribute("aria-valuemax", "100");
  });
});
