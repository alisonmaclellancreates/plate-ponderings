import { act, render, screen } from "@testing-library/react";
import { useIsMobile } from "@/hooks/use-mobile";

function Probe() {
  return <span data-testid="v">{String(useIsMobile())}</span>;
}

describe("useIsMobile", () => {
  const originalMatchMedia = window.matchMedia;
  const originalWidth = window.innerWidth;
  let listener: (() => void) | undefined;
  let removed: unknown;

  beforeEach(() => {
    listener = undefined;
    removed = undefined;
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: (_: string, cb: () => void) => {
        listener = cb;
      },
      removeEventListener: (_: string, cb: () => void) => {
        removed = cb;
      },
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.innerWidth = originalWidth;
  });

  it("starts as desktop and crosses to mobile", () => {
    window.innerWidth = 1024;
    render(<Probe />);
    expect(screen.getByTestId("v")).toHaveTextContent("false");
    act(() => {
      window.innerWidth = 500;
      listener?.();
    });
    expect(screen.getByTestId("v")).toHaveTextContent("true");
  });

  it("starts as mobile and crosses to desktop", () => {
    window.innerWidth = 767;
    render(<Probe />);
    expect(screen.getByTestId("v")).toHaveTextContent("true");
    act(() => {
      window.innerWidth = 768;
      listener?.();
    });
    expect(screen.getByTestId("v")).toHaveTextContent("false");
  });

  it("removes its listener on unmount", () => {
    window.innerWidth = 1024;
    const { unmount } = render(<Probe />);
    expect(listener).toBeTypeOf("function");
    unmount();
    expect(removed).toBe(listener);
  });
});
