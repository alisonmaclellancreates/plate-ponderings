import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    search,
    children,
    className,
  }: {
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
    children: ReactNode;
    className?: string;
  }) => {
    const path = params ? to.replace(/\$(\w+)/, (_, k: string) => params[k] ?? "") : to;
    const qs = search ? `?${new URLSearchParams(search)}` : "";
    return (
      <a href={path + qs} className={className}>
        {children}
      </a>
    );
  },
}));

import {
  JURISDICTION_ERROR,
  SPOT_OUTCOMES,
  SpotOutcomePage,
  SpotPage,
  TEXT_ERROR,
  validateSpot,
  type SpotOutcome,
} from "@/components/site/SpotPlate";

const buttons = () =>
  [...document.querySelectorAll("main a, main button")].map((b) => b.textContent);

describe("validateSpot", () => {
  it("requires a jurisdiction and plate text of up to 8 allowed characters", () => {
    expect(validateSpot({ jurisdiction: "Utah", text: "TR-AI LS" })).toEqual({});
    expect(validateSpot({ jurisdiction: "Utah", text: "ABCD-EFGH" })).toEqual({});
    expect(validateSpot({})).toEqual({ jurisdiction: JURISDICTION_ERROR, text: TEXT_ERROR });
    expect(validateSpot({ jurisdiction: "Utah", text: "HI@!" }).text).toBe(TEXT_ERROR);
    expect(validateSpot({ jurisdiction: "Utah", text: "ABCDEFGHI" }).text).toBe(TEXT_ERROR);
  });
});

describe("Spot a Plate form", () => {
  it("shows the sign, labelled fields, coral button and next steps", () => {
    render(<SpotPage />);
    expect(screen.getByTestId("wooden-sign").textContent).toContain("Spot a Plate");
    expect(screen.getByLabelText("State or Province")).toBeRequired();
    const text = screen.getByLabelText("Plate text");
    expect(text).toHaveAccessibleDescription("Up to 8 characters. Spaces and dashes are ignored");
    expect(screen.getByRole("button", { name: "Check This Plate" })).toHaveClass("brand-btn-coral");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("shows inline errors when submitted empty, linked to each field", async () => {
    render(<SpotPage />);
    await userEvent.click(screen.getByRole("button", { name: "Check This Plate" }));
    expect(screen.getByLabelText("State or Province")).toHaveAccessibleDescription(
      JURISDICTION_ERROR,
    );
    expect(screen.getByLabelText("Plate text")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(TEXT_ERROR)).toBeInTheDocument();
  });
});

describe("Spot outcome previews", () => {
  it("validation shows both errors without submitting", () => {
    render(<SpotOutcomePage outcome="validation" />);
    expect(screen.getByText(JURISDICTION_ERROR)).toBeInTheDocument();
    expect(screen.getByText(TEXT_ERROR)).toBeInTheDocument();
  });

  it("checking announces the wait", () => {
    render(<SpotOutcomePage outcome="checking" />);
    expect(screen.getByRole("heading", { name: "Checking the collection..." })).toBeInTheDocument();
    expect(screen.getByRole("status").textContent).toBe("Just a moment while we look.");
    expect(screen.getByRole("img", { name: /magnifying glass/ })).toBeInTheDocument();
  });

  it("exists shows LV2CODE with its strip and buttons", () => {
    render(<SpotOutcomePage outcome="exists" />);
    expect(screen.getByText("LV2CODE")).toBeInTheDocument();
    const strip = within(screen.getByRole("list", { name: "Plate status" }));
    expect(strip.getByText("5 stories")).toBeInTheDocument();
    expect(strip.getByText("Mixed views")).toBeInTheDocument();
    expect(strip.getByText("No owner yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View This Plate" })).toHaveClass("brand-btn-navy");
    expect(screen.getByRole("button", { name: "Add Your Story" })).toHaveClass("brand-btn-outline");
    expect(screen.getByRole("link", { name: "Back to Spot a Plate" })).toHaveAttribute(
      "href",
      "/spot",
    );
  });

  it("new shows B7K2L9 with coral and outline buttons", () => {
    render(<SpotOutcomePage outcome="new" />);
    expect(screen.getByText("B7K2L9")).toBeInTheDocument();
    expect(screen.getByText(/You're the first to add it!/)).toBeInTheDocument();
    expect(buttons()).toEqual(["Add the First Story", "Explore More Plates"]);
  });

  it("pending offers submissions and explore, never a story button", () => {
    render(<SpotOutcomePage outcome="pending" />);
    expect(screen.getByTestId("wooden-sign").textContent).toBe("Checking this one out...");
    expect(buttons()).toEqual(["Go to Your Submissions", "Back to Explore"]);
    expect(document.body.textContent).not.toMatch(/add a story/i);
  });

  it("rejected never uses blaming words", () => {
    render(<SpotOutcomePage outcome="rejected" />);
    expect(
      screen.getByRole("heading", { name: "We couldn't add this plate." }),
    ).toBeInTheDocument();
    expect(buttons()).toEqual(["Try Another Plate", "Back to Explore"]);
    expect(document.body.textContent).not.toMatch(/offensive|unsafe|invalid|against the rules/i);
  });

  it("already-spotted fills Utah TRAILS and only offers Back to Search", () => {
    render(<SpotOutcomePage outcome="already-spotted" />);
    expect(screen.getByLabelText("State or Province")).toHaveValue("Utah");
    expect(screen.getByLabelText("Plate text")).toHaveValue("TRAILS");
    const panel = within(screen.getByTestId("roadside-sign"));
    expect(panel.getByRole("heading").textContent).toBe("Someone spotted this one already!");
    const links = panel.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Back to Search"]);
    expect(links[0]).toHaveAttribute("href", "/?jurisdiction=Utah&text=TRAILS");
    expect(panel.queryByText("TRAILS")).toBeNull();
    expect(document.body.textContent).not.toMatch(/notify/i);
  });

  it("error shows the Sasquatch placeholder with two buttons", () => {
    render(<SpotOutcomePage outcome="error" />);
    expect(screen.getByRole("img", { name: "A friendly Sasquatch" })).toBeInTheDocument();
    expect(buttons()).toEqual(["Try Again", "Go Back"]);
  });

  it("every outcome renders a single heading", () => {
    for (const outcome of Object.keys(SPOT_OUTCOMES) as SpotOutcome[]) {
      const { unmount } = render(<SpotOutcomePage outcome={outcome} />);
      expect(document.querySelector("main")).not.toBeNull();
      unmount();
    }
  });
});
