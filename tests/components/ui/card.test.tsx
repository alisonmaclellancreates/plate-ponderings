import { render, screen } from "@testing-library/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

describe("Card", () => {
  it("renders every part with its base and caller classes", () => {
    render(
      <Card className="card-x" data-testid="card">
        <CardHeader className="header-x" data-testid="header">
          <CardTitle className="title-x">Plate</CardTitle>
          <CardDescription className="desc-x">Ontario</CardDescription>
        </CardHeader>
        <CardContent className="content-x">Story</CardContent>
        <CardFooter className="footer-x">Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByTestId("card")).toHaveClass("rounded-xl", "card-x");
    expect(screen.getByTestId("header")).toHaveClass("p-6", "header-x");
    expect(screen.getByText("Plate")).toHaveClass("font-semibold", "title-x");
    expect(screen.getByText("Ontario")).toHaveClass("text-muted-foreground", "desc-x");
    expect(screen.getByText("Story")).toHaveClass("pt-0", "content-x");
    expect(screen.getByText("Footer")).toHaveClass("items-center", "footer-x");
  });
});
