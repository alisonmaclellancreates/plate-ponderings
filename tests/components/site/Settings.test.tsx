import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

import { DeleteConfirmPage, SettingsPage } from "@/components/site/Settings";
import { BLOCKED_HANDLES, BLOCKING_EXPLANATION, DELETE_ACCOUNT_WARNING } from "@/lib/mock-data";

describe("SettingsPage", () => {
  it("lists each blocked handle with an Unblock button and the blocking explanation", () => {
    render(<SettingsPage />);
    expect(screen.getAllByRole("button", { name: "Unblock" })).toHaveLength(BLOCKED_HANDLES.length);
    for (const handle of BLOCKED_HANDLES) expect(screen.getByText(handle)).toBeTruthy();
    expect(screen.getByText(BLOCKING_EXPLANATION)).toBeTruthy();
  });

  it("shows the delete warning and links Delete My Account to the confirmation", () => {
    render(<SettingsPage />);
    expect(screen.getByText(DELETE_ACCOUNT_WARNING)).toBeTruthy();
    const link = screen.getByRole("link", { name: "Delete My Account" });
    expect(link.getAttribute("href")).toBe("/settings/delete-confirm");
  });
});

describe("DeleteConfirmPage", () => {
  it("asks for confirmation with the same warning and both actions", () => {
    render(<DeleteConfirmPage />);
    expect(screen.getByRole("heading", { name: "Delete your account?" })).toBeTruthy();
    expect(screen.getByText(DELETE_ACCOUNT_WARNING)).toBeTruthy();
    const keep = screen.getByRole("link", { name: "Keep My Account" });
    expect(keep.getAttribute("href")).toBe("/settings");
    expect(screen.getByRole("button", { name: "Delete Account" })).toBeTruthy();
  });
});
