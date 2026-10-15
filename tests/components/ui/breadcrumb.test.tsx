import { render, screen } from "@testing-library/react";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

describe("Breadcrumb", () => {
  it("composes a full trail with landmarks, links and the current page", () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList className="list-x">
          <BreadcrumbItem className="item-x">
            <BreadcrumbLink href="/" className="link-x">
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="sep-x" data-testid="default-sep" />
          <BreadcrumbItem>
            <BreadcrumbEllipsis className="ell-x" data-testid="ellipsis" />
          </BreadcrumbItem>
          <BreadcrumbSeparator data-testid="custom-sep">/</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <button type="button">Plates</button>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage className="page-x">CA 4EVR</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByRole("navigation", { name: "breadcrumb" })).toBeInTheDocument();
    expect(container.querySelector("ol")).toHaveClass("list-x");
    expect(container.querySelector("li")).toHaveClass("item-x");
    const home = screen.getByRole("link", { name: "Home" });
    expect(home.tagName).toBe("A");
    expect(home).toHaveClass("link-x");
    const asChild = screen.getByRole("button", { name: "Plates" });
    expect(asChild).toHaveClass("hover:text-foreground");
    const page = screen.getByRole("link", { name: "CA 4EVR" });
    expect(page.tagName).toBe("SPAN");
    expect(page).toHaveAttribute("aria-current", "page");
    expect(page).toHaveClass("page-x");
    const defSep = screen.getByTestId("default-sep");
    expect(defSep).toHaveClass("sep-x");
    expect(defSep).toHaveAttribute("aria-hidden", "true");
    expect(defSep.querySelector("svg")).not.toBeNull();
    const customSep = screen.getByTestId("custom-sep");
    expect(customSep).toHaveTextContent("/");
    expect(customSep.querySelector("svg")).toBeNull();
    const ell = screen.getByTestId("ellipsis");
    expect(ell).toHaveClass("ell-x");
    expect(ell).toHaveTextContent("More");
  });
});
