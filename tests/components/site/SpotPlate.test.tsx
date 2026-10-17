import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

import { SpotForm, SpotOutcomePage, SpotPage } from "@/components/site/SpotPlate";
import {
  JURISDICTION_ERROR,
  SPOT_OUTCOMES,
  TEXT_EMPTY_ERROR,
  TEXT_ERROR,
  type SpotOutcome,
} from "@/lib/spot";

const buttons = () =>
  [...document.querySelectorAll("main a, main button")].map((b) => b.textContent);

describe("Spot a Plate form", () => {
  it.each([{ busy: true }, { isDemo: true }])("refuses submitted forms when %j", (props) => {
    const onSpot = vi.fn();
    render(<SpotForm {...props} values={{ jurisdiction: "Utah", text: "DRAGON" }} onSpot={onSpot} />);
    fireEvent.submit(screen.getByRole("form", { name: "Tell us the plate" }));
    expect(onSpot).not.toHaveBeenCalled();
  });
  it("validates missing form controls as empty instead of submitting", () => {
    const onSpot = vi.fn();
    render(<SpotForm onSpot={onSpot} />);
    screen.getByLabelText("State or Province").removeAttribute("name");
    screen.getByLabelText("Plate text").removeAttribute("name");
    fireEvent.submit(screen.getByRole("form", { name: "Tell us the plate" }));
    expect(screen.getByText(JURISDICTION_ERROR)).toBeInTheDocument();
    expect(screen.getByText(TEXT_EMPTY_ERROR)).toBeInTheDocument();
    expect(onSpot).not.toHaveBeenCalled();
  });
  it("shows the sign, labelled fields, coral button and next steps", () => {
    render(<SpotPage />);
    expect(screen.getByTestId("sign").textContent).toContain("Spot a Plate");
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
    expect(screen.getByText(TEXT_EMPTY_ERROR)).toBeInTheDocument();
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
    expect(screen.getByTestId("sign").textContent).toBe("Checking this one out...");
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

  it("error shows the Sasquatch with two buttons", () => {
    render(<SpotOutcomePage outcome="error" />);
    expect(screen.getByTestId("sasquatch")).toBeInTheDocument();
    expect(buttons()).toEqual(["Try Again", "Go Back"]);
  });

  it("renders the rate-limited preview through the shared pause outcome", () => {
    render(<SpotOutcomePage outcome="rate-limited" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("every outcome renders a single heading", () => {
    for (const outcome of Object.keys(SPOT_OUTCOMES) as SpotOutcome[]) {
      const { unmount } = render(<SpotOutcomePage outcome={outcome} />);
      expect(document.querySelector("main")).not.toBeNull();
      unmount();
    }
  });
});

describe("Spot artwork and headings", () => {
  const all = Object.keys(SPOT_OUTCOMES) as SpotOutcome[];

  it("every Spot page has exactly one h1, the sign title on form pages", () => {
    const { unmount } = render(<SpotPage />);
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual([
      "Spot a Plate",
    ]);
    unmount();
    for (const outcome of all) {
      const r = render(<SpotOutcomePage outcome={outcome} />);
      const h1s = screen.getAllByRole("heading", { level: 1 });
      expect(h1s).toHaveLength(1);
      if (outcome === "validation" || outcome === "already-spotted") {
        expect(h1s[0]?.textContent).toBe("Spot a Plate");
      } else {
        expect(within(screen.getByTestId("sign")).queryByRole("heading")).toBeNull();
      }
      r.unmount();
    }
  });

  it("shows the decorative signpost on every page", () => {
    for (const outcome of all) {
      const r = render(<SpotOutcomePage outcome={outcome} />);
      const img = screen.getByTestId("signpost");
      expect(img).toHaveAttribute("src", "/brand/signpost-v1.webp");
      expect(img).toHaveAttribute("alt", "");
      r.unmount();
    }
  });

  it("shows the Sasquatch only on error and rejected", () => {
    for (const outcome of all) {
      const r = render(<SpotOutcomePage outcome={outcome} />);
      const img = screen.queryByTestId("sasquatch");
      if (outcome === "error" || outcome === "rejected") {
        expect(img).toHaveAttribute("src", "/brand/sasquatch-v1.webp");
        expect(img).toHaveAttribute("alt", "");
      } else {
        expect(img).toBeNull();
      }
      r.unmount();
    }
  });
});

const live = vi.hoisted(() => ({ spot: vi.fn(), account: { account: null as unknown } }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => live.spot }));
vi.mock("@/lib/plates.functions", () => ({ spotPlate: vi.fn() }));
vi.mock("@/lib/account-auth", () => ({ useAccountAuth: () => live.account }));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

import { SpotLivePage } from "@/components/site/SpotPlate";

async function fillAndSpot(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByRole("combobox", { name: "State or Province" }), "Utah");
  await user.type(screen.getByRole("textbox", { name: /plate text/i }), "DRAGON");
  await user.click(screen.getByRole("button", { name: "Check This Plate" }));
}

describe("Spot a Plate live flow", () => {
  it("announces checking until the request resolves", async () => {
    let finish: ((result: { outcome: "pending" }) => void) | undefined;
    live.spot.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    render(<SpotLivePage values={{ jurisdiction: "Utah", text: "DRAGON" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Check This Plate" }));
    expect(screen.getByRole("status")).toHaveTextContent("Just a moment while we look.");
    expect(screen.queryByRole("button", { name: "Check This Plate" })).not.toBeInTheDocument();
    await act(async () => { finish?.({ outcome: "pending" }); });
    expect(screen.getByRole("link", { name: "Go to Your Submissions" })).toBeInTheDocument();
  });
  it("uses the returned real plate id for an existing plate", async () => {
    live.spot.mockResolvedValueOnce({ outcome: "exists", plate: { id: "real-plate", jurisdiction: "Utah", text: "DRAGON" } });
    render(<SpotLivePage />);
    await fillAndSpot(userEvent.setup());
    expect(screen.getByRole("link", { name: "View This Plate" })).toHaveAttribute("href", "/plate/real-plate");
    expect(screen.getByText("DRAGON")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Spot Another Plate" })).toHaveAttribute("href", "/spot");
  });
  it("turns a rate-limited response into a pause, not a failed check", async () => {
    live.spot.mockResolvedValue({
      outcome: "rate-limited",
      message: "You've done that a lot in a short time. Please wait a while and try again.",
    });
    render(<SpotLivePage />);
    await fillAndSpot(userEvent.setup());
    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go Back" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: "Try Again" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("sasquatch")).not.toBeInTheDocument();
  });
  it("shows the checking state, then the new-plate outcome", async () => {
    live.spot.mockResolvedValue({
      outcome: "new",
      plate: { id: "p1", jurisdiction: "Utah", text: "DRAGON" },
    });
    const user = userEvent.setup();
    render(<SpotLivePage />);
    await fillAndSpot(user);
    expect(live.spot).toHaveBeenCalledWith({ data: { jurisdiction: "Utah", text: "DRAGON" } });
    expect(await screen.findByText("A new mystery joins the collection!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add the First Story" }).getAttribute("href")).toBe(
      "/plate/p1",
    );
  });

  it("keeps the values and shows the already-spotted panel inline", async () => {
    live.spot.mockResolvedValue({ outcome: "already-spotted" });
    const user = userEvent.setup();
    render(<SpotLivePage values={{ jurisdiction: "Utah", text: "DRAGON" }} />);
    await user.click(screen.getByRole("button", { name: "Check This Plate" }));
    expect(await screen.findByText("Someone spotted this one already!")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "State or Province" })).toHaveValue("Utah");
  });

  it("shows the pending, rejected and error outcomes", async () => {
    const user = userEvent.setup();
    for (const [outcome, heading] of [
      ["pending", "Your mystery is waiting in the wings!"],
      ["rejected", "We couldn't add this plate."],
      ["error", "Hmm... something went wrong."],
    ] as const) {
      live.spot.mockResolvedValue({ outcome });
      const v = render(<SpotLivePage />);
      await fillAndSpot(user);
      expect(await screen.findByText(heading)).toBeInTheDocument();
      v.unmount();
    }
    live.spot.mockRejectedValue(new Error("down"));
    render(<SpotLivePage />);
    await fillAndSpot(user);
    expect(await screen.findByText("Hmm... something went wrong.")).toBeInTheDocument();
  });

  it("disables the form for the demo account", () => {
    live.account.account = { isDemo: true };
    render(<SpotLivePage />);
    expect(screen.getByRole("button", { name: "Check This Plate" })).toBeDisabled();
    expect(screen.getByText(/exploring the demo/i)).toBeInTheDocument();
    live.account.account = null;
  });
});
