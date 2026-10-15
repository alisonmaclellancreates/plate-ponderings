import { render, screen } from "@testing-library/react";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders a pulsing placeholder with caller props", () => {
    render(<Skeleton className="sk-x" data-testid="sk" />);
    expect(screen.getByTestId("sk")).toHaveClass("animate-pulse", "sk-x");
  });
});
