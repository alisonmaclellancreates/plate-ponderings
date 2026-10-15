import { render, screen } from "@testing-library/react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

describe("Pagination", () => {
  it("renders a pagination landmark with active and inactive links", () => {
    render(
      <Pagination className="nav-x">
        <PaginationContent className="list-x">
          <PaginationItem className="item-x">
            <PaginationPrevious href="#p" className="prev-x" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#2" isActive className="active-x">
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis className="ell-x" data-testid="ell" />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#n" className="next-x" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const nav = screen.getByRole("navigation", { name: "pagination" });
    expect(nav).toHaveClass("nav-x");
    expect(nav.querySelector("ul")).toHaveClass("list-x");
    expect(nav.querySelector("li")).toHaveClass("item-x");
    const inactive = screen.getByRole("link", { name: "1" });
    expect(inactive).not.toHaveAttribute("aria-current");
    expect(inactive).toHaveClass("hover:bg-accent", "h-9", "w-9");
    expect(inactive).not.toHaveClass("border-input");
    const active = screen.getByRole("link", { name: "2" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveClass("border-input", "active-x");
    const prev = screen.getByRole("link", { name: "Go to previous page" });
    expect(prev).toHaveTextContent("Previous");
    expect(prev).toHaveClass("pl-2.5", "px-4", "prev-x");
    const next = screen.getByRole("link", { name: "Go to next page" });
    expect(next).toHaveTextContent("Next");
    expect(next).toHaveClass("pr-2.5", "next-x");
    const ell = screen.getByTestId("ell");
    expect(ell).toHaveAttribute("aria-hidden", "true");
    expect(ell).toHaveTextContent("More pages");
    expect(ell).toHaveClass("ell-x");
  });
});
