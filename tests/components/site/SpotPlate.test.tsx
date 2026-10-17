import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

import { SpotForm } from "@/components/site/SpotPlate";
import { JURISDICTION_ERROR, TEXT_EMPTY_ERROR } from "@/lib/spot";

describe("Spot a Plate form", () => {
  it.each([{ busy: true }, { isDemo: true }])("refuses submitted forms when %j", (props) => {
    const onSpot = vi.fn();
    render(
      <SpotForm {...props} values={{ jurisdiction: "Utah", text: "DRAGON" }} onSpot={onSpot} />,
    );
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
    render(<SpotLivePage />);
    expect(screen.getByTestId("sign").textContent).toContain("Spot a Plate");
    expect(screen.getByLabelText("State or Province")).toBeRequired();
    const text = screen.getByLabelText("Plate text");
    expect(text).toHaveAccessibleDescription("Up to 8 characters. Spaces and dashes are ignored");
    expect(screen.getByRole("button", { name: "Check This Plate" })).toHaveClass("brand-btn-coral");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("shows inline errors when submitted empty, linked to each field", async () => {
    render(<SpotLivePage />);
    await userEvent.click(screen.getByRole("button", { name: "Check This Plate" }));
    expect(screen.getByLabelText("State or Province")).toHaveAccessibleDescription(
      JURISDICTION_ERROR,
    );
    expect(screen.getByLabelText("Plate text")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(TEXT_EMPTY_ERROR)).toBeInTheDocument();
  });
});

const live = vi.hoisted(() => ({ spot: vi.fn(), account: { account: null as unknown } }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => live.spot }));
vi.mock("@/lib/plates.functions", () => ({ spotPlate: vi.fn() }));
vi.mock("@/lib/account-auth", () => ({ useAccountAuth: () => live.account }));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

import { SpotLivePage } from "@/components/site/SpotPlate";
import { track } from "@/lib/analytics";

async function fillAndSpot(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByRole("combobox", { name: "State or Province" }), "Utah");
  await user.type(screen.getByRole("textbox", { name: /plate text/i }), "DRAGON");
  await user.click(screen.getByRole("button", { name: "Check This Plate" }));
}

describe("Spot a Plate live flow", () => {
  it("shows a server demo refusal and records only the refused action", async () => {
    live.spot.mockResolvedValueOnce({
      outcome: "demo",
      message: "Adding plates and stories is turned off in the demo.",
    });
    render(<SpotLivePage />);
    await fillAndSpot(userEvent.setup());
    expect(
      await screen.findByText("Adding plates and stories is turned off in the demo."),
    ).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("demo_write_refused", { action: "spot_plate" });
    expect(track).toHaveBeenLastCalledWith("subject_spotted", { outcome: "error" });
  });
  it("announces checking until the request resolves", async () => {
    let finish: ((result: { outcome: "pending" }) => void) | undefined;
    live.spot.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<SpotLivePage values={{ jurisdiction: "Utah", text: "DRAGON" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Check This Plate" }));
    expect(screen.getByRole("status")).toHaveTextContent("Just a moment while we look.");
    expect(screen.queryByRole("button", { name: "Check This Plate" })).not.toBeInTheDocument();
    await act(async () => {
      finish?.({ outcome: "pending" });
    });
    expect(screen.getByRole("link", { name: "Go to Your Submissions" })).toBeInTheDocument();
  });
  it("uses the returned real plate id for an existing plate", async () => {
    live.spot.mockResolvedValueOnce({
      outcome: "exists",
      plate: { id: "real-plate", jurisdiction: "Utah", text: "DRAGON" },
    });
    render(<SpotLivePage />);
    await fillAndSpot(userEvent.setup());
    expect(screen.getByRole("link", { name: "View This Plate" })).toHaveAttribute(
      "href",
      "/plate/real-plate",
    );
    expect(screen.getByText("DRAGON")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Spot Another Plate" })).toHaveAttribute(
      "href",
      "/spot",
    );
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
    expect(track).toHaveBeenLastCalledWith("subject_spotted", { outcome: "rate_limited" });
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

  it("keeps search-prefilled values and shows the already-spotted panel inline", async () => {
    live.spot.mockResolvedValue({ outcome: "already-spotted" });
    const user = userEvent.setup();
    render(<SpotLivePage values={{ jurisdiction: "Utah", text: "DRAGON" }} />);
    await user.click(screen.getByRole("button", { name: "Check This Plate" }));
    expect(await screen.findByText("Someone spotted this one already!")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "State or Province" })).toHaveValue("Utah");
    expect(screen.getByRole("textbox", { name: /plate text/i })).toHaveValue("DRAGON");
    expect(screen.getByRole("link", { name: "Back to Search" })).toHaveAttribute(
      "href",
      "/?jurisdiction=Utah&text=DRAGON",
    );
    expect(track).toHaveBeenLastCalledWith("subject_spotted", { outcome: "already_spotted" });
  });

  it("shows already-spotted feedback after opening /spot directly", async () => {
    live.spot.mockResolvedValue({ outcome: "already-spotted" });
    render(<SpotLivePage />);
    await fillAndSpot(userEvent.setup());
    expect(await screen.findByText("Someone spotted this one already!")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "State or Province" })).toHaveValue("Utah");
    expect(screen.getByRole("textbox", { name: /plate text/i })).toHaveValue("DRAGON");
    expect(screen.getByRole("link", { name: "Back to Search" })).toHaveAttribute(
      "href",
      "/?jurisdiction=Utah&text=DRAGON",
    );
  });

  it("uses submitted edits rather than the original search address values", async () => {
    live.spot.mockResolvedValue({ outcome: "already-spotted" });
    const user = userEvent.setup();
    render(<SpotLivePage values={{ jurisdiction: "Oregon", text: "ORIGINAL" }} />);
    await user.clear(screen.getByRole("textbox", { name: /plate text/i }));
    await fillAndSpot(user);
    expect(await screen.findByText("Someone spotted this one already!")).toBeInTheDocument();
    expect(live.spot).toHaveBeenLastCalledWith({ data: { jurisdiction: "Utah", text: "DRAGON" } });
    expect(screen.getByRole("combobox", { name: "State or Province" })).toHaveValue("Utah");
    expect(screen.getByRole("textbox", { name: /plate text/i })).toHaveValue("DRAGON");
    expect(screen.getByRole("link", { name: "Back to Search" })).toHaveAttribute(
      "href",
      "/?jurisdiction=Utah&text=DRAGON",
    );
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
