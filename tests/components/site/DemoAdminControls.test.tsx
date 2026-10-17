import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const m = vi.hoisted(() => ({ auth: vi.fn(), reset: vi.fn(), fill: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/account-auth", () => ({ useAccountAuth: m.auth }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: m.invalidate }),
}));
vi.mock("@/lib/demo-admin.functions", () => ({
  resetSeedData: m.reset,
  fillMissingGuesses: m.fill,
}));
import { DemoAdminControls } from "@/components/site/DemoAdminControls";
beforeEach(() => {
  vi.clearAllMocks();
  m.auth.mockReturnValue({ demoEnabled: true, account: { isAdmin: true, isDemo: false } });
  m.reset.mockResolvedValue({ outcome: "done", message: "Reset complete" });
  m.fill.mockResolvedValue({ outcome: "done", message: "2 plates still need a guess." });
});
it.each([
  null,
  { demoEnabled: false },
  { demoEnabled: true, account: null },
  { demoEnabled: true, account: { isAdmin: false } },
  { demoEnabled: true, account: { isAdmin: true, isDemo: true } },
])("hides controls for %j", (auth) => {
  m.auth.mockReturnValue(auth);
  render(<DemoAdminControls />);
  expect(screen.queryByRole("button")).toBeNull();
});
it("requires both confirmations and never calls reset on cancel", async () => {
  render(<DemoAdminControls />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Reset seed data" }));
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(m.reset).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Reset seed data" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  let dialog = screen.getByRole("dialog");
  expect(within(dialog).getByRole("button", { name: "Reset seed data" })).toBeDisabled();
  await user.type(screen.getByRole("textbox"), "RESET");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(m.reset).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Reset seed data" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByRole("textbox")).toHaveValue("");
  await user.type(screen.getByRole("textbox"), "RESET");
  dialog = screen.getByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "Reset seed data" }));
  await screen.findByText("Reset complete");
  expect(m.reset).toHaveBeenCalledWith({ data: { confirmation: "RESET" } });
  expect(m.invalidate).toHaveBeenCalled();
});
it.each(["done", "error", "throws"])("shows fill feedback for %s", async (outcome) => {
  if (outcome === "throws") m.fill.mockRejectedValue(new Error());
  else m.fill.mockResolvedValue({ outcome, message: "Fill result" });
  render(<DemoAdminControls />);
  await userEvent.click(screen.getByRole("button", { name: "Fill missing guesses" }));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      outcome === "throws" ? "Please retry" : "Fill result",
    ),
  );
  expect(m.invalidate).toHaveBeenCalledTimes(outcome === "done" ? 1 : 0);
});
it.each(["error", "throws"])(
  "shows reset feedback for %s and does not invalidate data",
  async (outcome) => {
    if (outcome === "throws") m.reset.mockRejectedValue(new Error("Reset offline"));
    else m.reset.mockResolvedValue({ outcome: "error", message: "Reset refused" });
    render(<DemoAdminControls />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Reset seed data" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByRole("textbox"), "RESET");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Reset seed data" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      outcome === "throws" ? "Please retry" : "Reset refused",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(m.invalidate).not.toHaveBeenCalled();
  },
);

it("keeps the confirmation dialog open when Escape is pressed during a reset", async () => {
  let finish: ((value: { outcome: string; message: string }) => void) | undefined;
  m.reset.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const user = userEvent.setup();
  render(<DemoAdminControls />);
  await user.click(screen.getByRole("button", { name: "Reset seed data" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.type(screen.getByRole("textbox"), "RESET");
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Reset seed data" }),
  );
  await user.keyboard("{Escape}");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("textbox")).toBeDisabled();
  finish?.({ outcome: "done", message: "Reset complete" });
  await screen.findByText("Reset complete");
});
