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

import { AboutPage, ContactPage, NotFoundPage, PrivacyPage } from "@/components/site/InfoPages";
import { BLOCKING_EXPLANATION, DELETE_ACCOUNT_WARNING } from "@/lib/mock-data";

describe("AboutPage", () => {
  it("tells the story and mentions #SheBuilds", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1, name: "About What the Plate?" })).toBeTruthy();
    expect(screen.getByText(/family member/)).toBeTruthy();
    expect(screen.getByText(/#SheBuilds/)).toBeTruthy();
  });
});

describe("PrivacyPage", () => {
  it("covers every section from the brief", () => {
    render(<PrivacyPage />);
    for (const heading of [
      "What we store",
      "Photos",
      "What the AI sees",
      "Blocking",
      "Deleting your stories and account",
    ])
      expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
    expect(screen.getByText(BLOCKING_EXPLANATION)).toBeTruthy();
    expect(screen.getByText(new RegExp(DELETE_ACCOUNT_WARNING.slice(0, 40)))).toBeTruthy();
    expect(screen.getByText(/never stored/)).toBeTruthy();
  });
});

describe("ContactPage", () => {
  it("shows the email link placeholder", () => {
    render(<ContactPage />);
    const link = screen.getByRole("link", { name: "hello@example.com" });
    expect(link.getAttribute("href")).toBe("mailto:hello@example.com");
  });
});

describe("NotFoundPage", () => {
  it("shows the sasquatch, the message and a way back to Explore", () => {
    render(<NotFoundPage />);
    expect(screen.getByTestId("sasquatch")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: "This road doesn't go anywhere." }),
    ).toBeTruthy();
    const back = screen.getByRole("link", { name: "Back to Explore" });
    expect(back.getAttribute("href")).toBe("/explore");
  });
});
