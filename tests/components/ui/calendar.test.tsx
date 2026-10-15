import { render, screen } from "@testing-library/react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";

const month = new Date(2026, 0, 1);

describe("Calendar", () => {
  it("renders a labelled month with chevron navigation", () => {
    const { container } = render(<Calendar defaultMonth={month} className="cal-x" />);
    const root = container.querySelector('[data-slot="calendar"]')!;
    expect(root).toHaveClass("cal-x");
    expect(screen.getByText("January 2026")).toHaveClass("text-sm");
    expect(screen.getByRole("button", { name: /previous/i }).querySelector("svg")).toHaveClass(
      "lucide-chevron-left",
    );
    expect(screen.getByRole("button", { name: /next/i }).querySelector("svg")).toHaveClass(
      "lucide-chevron-right",
    );
  });

  it("uses short month names and a down chevron in dropdown layout", () => {
    const { container } = render(
      <Calendar
        defaultMonth={month}
        captionLayout="dropdown"
        startMonth={new Date(2025, 0)}
        endMonth={new Date(2027, 11)}
      />,
    );
    expect(screen.getAllByRole("option", { name: "Jan" }).length).toBeGreaterThan(0);
    expect(container.querySelector(".lucide-chevron-down")).not.toBeNull();
  });

  it("renders week numbers in custom cells", () => {
    const { container } = render(<Calendar defaultMonth={month} showWeekNumber />);
    const cells = container.querySelectorAll("td .size-\\(--cell-size\\)");
    expect(cells.length).toBeGreaterThan(0);
    expect(cells[0]!.textContent).toMatch(/^\d+$/);
  });

  it("marks a single selected day", () => {
    const { container } = render(
      <Calendar mode="single" month={month} selected={new Date(2026, 0, 15)} />,
    );
    const sel = container.querySelectorAll('[data-selected-single="true"]');
    expect(sel).toHaveLength(1);
    expect(sel[0]).toHaveAttribute("data-day", new Date(2026, 0, 15).toLocaleDateString());
  });

  it("marks range start, middle and end", () => {
    const { container } = render(
      <Calendar
        mode="range"
        month={month}
        selected={{ from: new Date(2026, 0, 10), to: new Date(2026, 0, 12) }}
      />,
    );
    expect(container.querySelectorAll('[data-range-start="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-range-middle="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-range-end="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-selected-single="true"]')).toHaveLength(0);
  });
});

describe("CalendarDayButton", () => {
  const day = { date: new Date(2026, 0, 5) } as never;

  it("focuses itself when the focused modifier is set", () => {
    render(
      <CalendarDayButton day={day} modifiers={{ focused: true }}>
        5
      </CalendarDayButton>,
    );
    expect(screen.getByRole("button", { name: "5" })).toHaveFocus();
  });

  it("does not focus without the modifier", () => {
    render(
      <CalendarDayButton day={day} modifiers={{ selected: true }} className="d-x">
        6
      </CalendarDayButton>,
    );
    const b = screen.getByRole("button", { name: "6" });
    expect(b).not.toHaveFocus();
    expect(b).toHaveClass("d-x");
    expect(b).toHaveAttribute("data-selected-single", "true");
  });
});
