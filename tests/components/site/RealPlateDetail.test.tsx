import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    search,
    children,
    className,
  }: {
    to: string;
    search?: Record<string, string>;
    children: ReactNode;
    className?: string;
  }) => {
    const qs = search ? `?${new URLSearchParams(search)}` : "";
    return (
      <a href={to + qs} className={className}>
        {children}
      </a>
    );
  },
}));

import { RealPlateDetail } from "@/components/site/PlateDetail";

const plate = { id: "p1", jurisdiction: "Washington", text: "B7K 2L9" };

describe("RealPlateDetail", () => {
  it("renders the live plate as a mystery with no owner", () => {
    render(<RealPlateDetail plate={plate} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Washington plate B7K 2L9" }),
    ).toBeTruthy();
    const strip = screen.getByRole("list", { name: "Plate status" });
    expect(within(strip).getByText("0 stories")).toBeTruthy();
    expect(within(strip).getByText("Mystery")).toBeTruthy();
    expect(within(strip).getByText("No owner yet")).toBeTruthy();
  });

  it("links Back to Search with the searched values when arriving from search", () => {
    render(
      <RealPlateDetail
        plate={plate}
        backToSearch={{ jurisdiction: "Washington", text: "B7K 2L9" }}
      />,
    );
    const back = screen.getByRole("link", { name: "Back to Search" });
    expect(back.getAttribute("href")).toBe("/?jurisdiction=Washington&text=B7K+2L9");
  });

  it("falls back to Explore without search values", () => {
    render(<RealPlateDetail plate={plate} />);
    expect(screen.getByRole("link", { name: "Back to Explore" }).getAttribute("href")).toBe(
      "/explore",
    );
  });
});
