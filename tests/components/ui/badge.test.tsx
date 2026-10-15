import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("applies the default variant and a caller className", () => {
    render(<Badge className="badge-x">New</Badge>);
    expect(screen.getByText("New")).toHaveClass("bg-primary", "badge-x");
  });
  it("applies a non-default variant", () => {
    render(<Badge variant="outline">Out</Badge>);
    const el = screen.getByText("Out");
    expect(el).toHaveClass("text-foreground");
    expect(el).not.toHaveClass("bg-primary");
  });
});
