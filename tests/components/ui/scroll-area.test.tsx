import { render, screen } from "@testing-library/react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

describe("ScrollArea", () => {
  it("renders content with vertical and horizontal scrollbars", () => {
    const { container } = render(
      <ScrollArea type="always" className="sa-x">
        <p>Long list</p>
        <ScrollBar orientation="horizontal" className="bar-x" />
      </ScrollArea>,
    );
    expect(container.firstElementChild).toHaveClass("relative", "sa-x");
    expect(screen.getByText("Long list")).toBeInTheDocument();
    const vertical = container.querySelector('[data-orientation="vertical"]');
    const horizontal = container.querySelector('[data-orientation="horizontal"]');
    expect(vertical).toHaveClass("w-2.5", "border-l");
    expect(vertical).not.toHaveClass("flex-col");
    expect(horizontal).toHaveClass("h-2.5", "flex-col", "bar-x");
    expect(horizontal).not.toHaveClass("border-l");
  });
});
