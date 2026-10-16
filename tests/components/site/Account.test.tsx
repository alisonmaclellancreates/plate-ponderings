import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string;
    params?: Record<string, string>;
    children: ReactNode;
    className?: string;
  }) => (
    <a
      href={params ? to.replace(/\$(\w+)/, (_, k: string) => params[k] ?? "") : to}
      className={className}
    >
      {children}
    </a>
  ),
}));

import { HANDLE_HELP, ProfilePage, SubmissionsPage } from "@/components/site/Account";
import { SUBMISSIONS } from "@/lib/mock-data";

describe("SubmissionsPage", () => {
  it("lists rows newest first with one h1", () => {
    render(<SubmissionsPage rows={[...SUBMISSIONS].reverse()} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const rows = screen.getAllByTestId("submission");
    expect(
      rows.map((r) => within(r).getByRole("img", { name: /plate/ }).getAttribute("aria-label")),
    ).toEqual([
      "Oregon plate PNW LV",
      "California plate TEATIME",
      "Washington plate LV2CODE",
      "Utah plate CANYONS",
      "Colorado plate TRAILS",
    ]);
    expect(rows[0]).toHaveTextContent("Oregon · Plate submission · Oct 9, 2026");
    expect(rows[1]).toHaveTextContent("California · Your story · Oct 8, 2026");
  });

  it("gives pending rows no action or chevron and marks updated rows", () => {
    render(<SubmissionsPage />);
    const rows = screen.getAllByTestId("submission");
    const pending = rows[2]!;
    expect(within(pending).queryByRole("link")).toBeNull();
    expect(within(pending).queryByRole("button")).toBeNull();
    expect(within(pending).queryByTestId("chevron")).toBeNull();
    expect(within(rows[0]!).getByText("Updated")).toBeInTheDocument();
    expect(within(rows[3]!).getByText("Updated")).toBeInTheDocument();
    expect(within(rows[3]!).getAllByRole("button", { name: "Dismiss" }).length).toBeGreaterThan(0);
    expect(within(rows[0]!).getAllByRole("link", { name: "View Plate" })[0]).toHaveAttribute(
      "href",
      "/plate/pnw-lv",
    );
    expect(within(rows[4]!).getAllByRole("button", { name: "View Plate" }).length).toBeGreaterThan(
      0,
    );
  });
});

describe("ProfilePage", () => {
  it("shows the handle, availability, help, save and sample story", () => {
    render(<ProfilePage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const field = screen.getByLabelText("Handle");
    expect(field).toHaveValue("Traveler4821");
    expect(field).toHaveAccessibleDescription(`Available ${HANDLE_HELP}`);
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    expect(screen.getByTestId("sample-story")).toHaveTextContent("Traveler4821");
  });
});
