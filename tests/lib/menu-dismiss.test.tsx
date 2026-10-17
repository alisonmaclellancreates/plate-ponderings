import { useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMenuDismiss } from "@/lib/menu-dismiss";

function Menu() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useMenuDismiss(open, setOpen, container);
  return (
    <>
      <div ref={container}>
        <button onClick={() => setOpen(!open)}>Toggle</button>
        {open && <button>Inside</button>}
      </div>
      <button>Outside</button>
    </>
  );
}

afterEach(() => vi.restoreAllMocks());

describe("useMenuDismiss", () => {
  it("does nothing while closed and ignores inside presses and other keys while open", () => {
    const add = vi.spyOn(document, "addEventListener");
    render(<Menu />);
    expect(add.mock.calls.filter(([type]) => type === "keydown" || type === "pointerdown")).toEqual(
      [],
    );
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("button", { name: "Inside" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Inside" }));
    fireEvent.keyDown(document, { key: "Enter" });
    expect(screen.getByRole("button", { name: "Inside" })).toBeInTheDocument();
  });

  it.each(["escape", "outside"])("closes on %s and returns focus to the opener", (exit) => {
    render(<Menu />);
    const opener = screen.getByRole("button", { name: "Toggle" });
    opener.focus();
    fireEvent.click(opener);
    screen.getByRole("button", { name: "Inside" }).focus();
    if (exit === "escape") fireEvent.keyDown(document, { key: "Escape" });
    else fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("button", { name: "Inside" })).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("removes the exact capture listeners on close and unmount", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const view = render(<Menu />);
    const toggle = screen.getByRole("button", { name: "Toggle" });
    for (const exit of ["close", "unmount"]) {
      fireEvent.click(toggle);
      const listeners = add.mock.calls
        .filter(([type]) => type === "keydown" || type === "pointerdown")
        .slice(-2);
      expect(listeners).toHaveLength(2);
      if (exit === "close") fireEvent.click(toggle);
      else view.unmount();
      for (const [type, listener, capture] of listeners) {
        expect(remove).toHaveBeenCalledWith(type, listener, capture);
        expect(capture).toBe(true);
      }
    }
  });

  it("handles a missing container and a non-HTMLElement opener", () => {
    const active = vi.spyOn(document, "activeElement", "get").mockReturnValue(null);
    const close = vi.fn();
    function MissingContainer() {
      const container = useRef<HTMLElement | null>(null);
      useMenuDismiss(true, close, container);
      return null;
    }
    render(<MissingContainer />);
    fireEvent.pointerDown(document);
    expect(close).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(close).toHaveBeenCalledWith(false);
    active.mockRestore();
  });

  it("ignores pointer events whose target is not a Node", () => {
    render(<Menu />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    const event = new Event("pointerdown", { bubbles: true });
    Object.defineProperty(event, "target", { value: window });
    fireEvent(document, event);
    expect(screen.getByRole("button", { name: "Inside" })).toBeInTheDocument();
  });
});
