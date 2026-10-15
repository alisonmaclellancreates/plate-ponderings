import { render, screen } from "@testing-library/react";
import { Label } from "@/components/ui/label";

describe("Label", () => {
  it("labels its control and merges className", () => {
    render(
      <>
        <Label htmlFor="plate" className="label-x">Plate text</Label>
        <input id="plate" />
      </>,
    );
    expect(screen.getByRole("textbox", { name: "Plate text" })).toBeInTheDocument();
    expect(screen.getByText("Plate text")).toHaveClass("text-sm", "label-x");
  });
});
