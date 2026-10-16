import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { AdminPage } from "@/components/site/Admin";
import { REPORTED_STORIES } from "@/lib/mock-data";

describe("AdminPage", () => {
  it("shows the heading and the recheck row", () => {
    render(<AdminPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Admin" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Recheck pending" })).toBeTruthy();
    expect(screen.getByText("2 items waiting for a safety check.")).toBeTruthy();
  });

  it("keeps the table inside a horizontally scrollable container", () => {
    render(<AdminPage />);
    const scroll = screen.getByTestId("admin-table-scroll");
    expect(scroll.className).toContain("overflow-x-auto");
    expect(within(scroll).getByRole("table", { name: "Reported stories" })).toBeTruthy();
  });

  it("lists every reported story with its status action", () => {
    render(<AdminPage />);
    const table = within(screen.getByRole("table", { name: "Reported stories" }));
    const rows = table.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(REPORTED_STORIES.length);
    for (const story of REPORTED_STORIES) {
      expect(table.getByText(story.handle)).toBeTruthy();
      expect(table.getByText(story.meaning)).toBeTruthy();
    }
    expect(table.getAllByRole("button", { name: "Hide" })).toHaveLength(
      REPORTED_STORIES.filter((s) => s.status === "visible").length,
    );
    expect(table.getAllByRole("button", { name: "Unhide" })).toHaveLength(
      REPORTED_STORIES.filter((s) => s.status === "hidden").length,
    );
  });
});
