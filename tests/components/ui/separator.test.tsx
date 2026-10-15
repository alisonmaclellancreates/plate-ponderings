import { render, screen } from "@testing-library/react";
import { Separator } from "@/components/ui/separator";

describe("Separator", () => {
  it("defaults to a decorative horizontal rule", () => {
    const { container } = render(<Separator className="sep-x" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute("role", "none");
    expect(el).toHaveAttribute("data-orientation", "horizontal");
    expect(el).toHaveClass("h-[1px]", "w-full", "sep-x");
  });
  it("renders a semantic vertical separator", () => {
    render(<Separator orientation="vertical" decorative={false} />);
    const el = screen.getByRole("separator");
    expect(el).toHaveAttribute("aria-orientation", "vertical");
    expect(el).toHaveClass("h-full", "w-[1px]");
  });
});
