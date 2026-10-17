import { act, render, screen } from "@testing-library/react";
import { OTPInputContext } from "input-otp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

describe("InputOTP", () => {
  it("renders slots for each state", () => {
    const value = {
      slots: [
        { char: "A", hasFakeCaret: false, isActive: false, placeholderChar: null },
        { char: null, hasFakeCaret: false, isActive: true, placeholderChar: null },
        { char: null, hasFakeCaret: true, isActive: true, placeholderChar: null },
      ],
      isFocused: true,
      isHovering: false,
    };
    render(
      <OTPInputContext.Provider value={value}>
        <InputOTPGroup className="grp-x" data-testid="grp">
          <InputOTPSlot index={0} data-testid="s0" />
          <InputOTPSlot index={1} data-testid="s1" />
          <InputOTPSeparator />
          <InputOTPSlot index={2} data-testid="s2" className="slot-x" />
          <InputOTPSlot index={9} data-testid="s9" />
        </InputOTPGroup>
      </OTPInputContext.Provider>,
    );
    expect(screen.getByTestId("grp")).toHaveClass("flex", "grp-x");
    expect(screen.getByTestId("s0")).toHaveTextContent("A");
    expect(screen.getByTestId("s0")).not.toHaveClass("ring-1");
    expect(screen.getByTestId("s1")).toHaveClass("ring-1");
    expect(screen.getByTestId("s1").querySelector(".animate-caret-blink")).toBeNull();
    expect(screen.getByTestId("s2")).toHaveClass("slot-x");
    expect(screen.getByTestId("s2").querySelector(".animate-caret-blink")).not.toBeNull();
    expect(screen.getByTestId("s9")).toBeEmptyDOMElement();
    expect(screen.getByRole("separator").querySelector("svg")).not.toBeNull();
  });

  it("renders the real input with merged class names", async () => {
    const { container, unmount } = render(
      <InputOTP maxLength={3} containerClassName="wrap-x" className="in-x">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
        </InputOTPGroup>
      </InputOTP>,
    );
    expect(container.querySelector(".wrap-x")).not.toBeNull();
    expect(container.querySelector("input")).toHaveClass("in-x", "disabled:cursor-not-allowed");
    // input-otp schedules uncleared selection-sync timeouts at 0, 10 and 50ms on mount.
    // Let them fire while the DOM still exists, then unmount inside the test.
    await act(() => new Promise((resolve) => setTimeout(resolve, 60)));
    unmount();
  });
});
