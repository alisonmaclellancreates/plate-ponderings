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
  it("covers every section with the wording the app actually follows", () => {
    render(<PrivacyPage />);
    for (const heading of [
      "What we store",
      "Photos",
      "What the AI sees",
      "Blocking",
      "Deleting your published stories and your account",
    ])
      expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
    expect(
      screen.getByText(
        /Your email address and handle, the plates you spot, your stories and their blurred photos, the hearts you give, the reports you send, the people you block, and your notifications\./,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(/summaries written from published stories, and their history/),
    ).toBeTruthy();
    expect(screen.getByText(/never stored by our application/)).toBeTruthy();
    expect(screen.getByText(/Our safety checks use AI to review each new plate/)).toBeTruthy();
    expect(screen.getByText(/so they see submissions before anyone else does/)).toBeTruthy();
    expect(screen.getByText(/You can delete any of your published stories\./)).toBeTruthy();
    expect(screen.getByText(BLOCKING_EXPLANATION)).toBeTruthy();
    expect(screen.getByText(new RegExp(DELETE_ACCOUNT_WARNING.slice(0, 40)))).toBeTruthy();
    expect(screen.queryByText(/That's it/)).toBeNull();
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
