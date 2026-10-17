import { beforeEach, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
const m = vi.hoisted(() => ({
  track: vi.fn(),
  callback: undefined as undefined | ((entries: { isIntersecting: boolean }[]) => void),
  disconnect: vi.fn(),
}));
vi.mock("@/lib/analytics", () => ({ track: m.track }));
import { PlateGuessPanel } from "@/components/site/PlateGuessPanel";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: typeof m.callback) {
        m.callback = cb;
      }
      observe() {}
      disconnect() {
        m.disconnect();
      }
    },
  );
});
it("captures only when visible, once per plate, with no text properties", () => {
  const { rerender, unmount } = render(
    <PlateGuessPanel plateId="one" meaning="secret" story="fiction" />,
  );
  m.callback?.([{ isIntersecting: false }]);
  expect(m.track).not.toHaveBeenCalled();
  m.callback?.([{ isIntersecting: true }]);
  m.callback?.([{ isIntersecting: true }]);
  expect(m.track).toHaveBeenCalledTimes(1);
  expect(m.track).toHaveBeenCalledWith("ai_guess_revealed", {});
  rerender(<PlateGuessPanel plateId="two" meaning="other" story="fiction" />);
  m.callback?.([{ isIntersecting: true }]);
  expect(m.track).toHaveBeenCalledTimes(2);
  unmount();
  expect(m.disconnect).toHaveBeenCalledTimes(2);
});
