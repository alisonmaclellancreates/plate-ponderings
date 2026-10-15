import { render, screen } from "@testing-library/react";
import { Progress } from "@/components/ui/progress";

const indicator = (el: HTMLElement) => el.firstElementChild as HTMLElement;

describe("Progress", () => {
  it("offsets the indicator by the value", () => {
    render(<Progress value={40} className="pg-x" aria-label="done" />);
    const bar = screen.getByRole("progressbar", { name: "done" });
    expect(bar).toHaveClass("pg-x");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(indicator(bar).style.transform).toBe("translateX(-60%)");
  });
  it("treats a missing value as zero", () => {
    render(<Progress aria-label="empty" />);
    const bar = screen.getByRole("progressbar", { name: "empty" });
    expect(indicator(bar).style.transform).toBe("translateX(-100%)");
  });
});
