import { render, screen } from "@testing-library/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

describe("Alert", () => {
  it("renders an alert role with title, description and variant classes", () => {
    render(
      <Alert variant="destructive" className="alert-x">
        <AlertTitle className="title-x">Heads up</AlertTitle>
        <AlertDescription className="desc-x">Something happened.</AlertDescription>
      </Alert>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("text-destructive", "alert-x");
    expect(screen.getByRole("heading", { level: 5, name: "Heads up" })).toHaveClass("title-x");
    expect(screen.getByText("Something happened.")).toHaveClass("text-sm", "desc-x");
  });

  it("uses the default variant when none is given", () => {
    render(<Alert>Plain</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-background");
  });
});
