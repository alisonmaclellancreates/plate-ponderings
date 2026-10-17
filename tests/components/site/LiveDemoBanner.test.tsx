import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/account-auth", () => ({ useAccountAuth: m.auth }));
import { LiveDemoBanner } from "@/components/site/LiveDemoBanner";
it.each([null, { account: null }, { account: { isDemo: false }, demoEnabled: true }, { account: { isDemo: true }, demoEnabled: false }])("omits the banner outside enabled demo browsing %j", (auth) => {
  m.auth.mockReturnValue(auth);
  render(<LiveDemoBanner />);
  expect(screen.queryByRole("status")).toBeNull();
});
it("shows the approved banner on enabled demo browsing", () => {
  m.auth.mockReturnValue({ account: { isDemo: true }, demoEnabled: true });
  render(<LiveDemoBanner />);
  expect(screen.getByRole("status")).toHaveTextContent("You're exploring the demo.");
});