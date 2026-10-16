import { render, screen } from "@testing-library/react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

describe("Table", () => {
  it("composes every part into an accessible table", () => {
    render(
      <Table className="table-x">
        <TableCaption className="cap-x">Plates</TableCaption>
        <TableHeader className="head-x">
          <TableRow>
            <TableHead className="th-x">Plate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="body-x">
          <TableRow className="row-x">
            <TableCell className="td-x">GR8 DAY</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter className="foot-x">
          <TableRow>
            <TableCell>Total 1</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    const table = screen.getByRole("table", { name: "Plates" });
    expect(table).toHaveClass("caption-bottom", "table-x");
    expect(table.parentElement).toHaveClass("overflow-auto");
    expect(screen.getByText("Plates")).toHaveClass("cap-x");
    expect(table.querySelector("thead")).toHaveClass("head-x");
    expect(table.querySelector("tbody")).toHaveClass("body-x");
    expect(table.querySelector("tfoot")).toHaveClass("foot-x");
    expect(screen.getByRole("columnheader", { name: "Plate" })).toHaveClass("th-x");
    expect(screen.getByRole("cell", { name: "GR8 DAY" })).toHaveClass("td-x");
    expect(screen.getByRole("cell", { name: "GR8 DAY" }).parentElement).toHaveClass("row-x");
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });
});
