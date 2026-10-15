import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

function Harness() {
  return (
    <NavigationMenu className="nav-x">
      <NavigationMenuList className="list-x">
        <NavigationMenuItem>
          <NavigationMenuTrigger className="trig-x">States</NavigationMenuTrigger>
          <NavigationMenuContent className="content-x">
            <NavigationMenuLink href="#or">Oregon</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Provinces</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#on">Ontario</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuIndicator className="ind-x" />
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const OriginalRO = globalThis.ResizeObserver;

afterEach(() => {
  globalThis.ResizeObserver = OriginalRO;
});

describe("NavigationMenu", () => {
  it("exposes the trigger style helper", () => {
    expect(navigationMenuTriggerStyle()).toContain("inline-flex");
  });

  it("opens content into the viewport on click", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole("navigation")).toHaveClass("max-w-max", "nav-x");
    expect(screen.getByRole("list")).toHaveClass("list-none", "list-x");
    const trig = screen.getByRole("button", { name: "States" });
    expect(trig).toHaveClass("inline-flex", "trig-x");
    expect(screen.queryByRole("link", { name: "Oregon" })).toBeNull();
    await user.click(trig);
    expect(trig).toHaveAttribute("aria-expanded", "true");
    const link = await screen.findByRole("link", { name: "Oregon" });
    expect(link.closest(".content-x")).not.toBeNull();
    expect(link.closest("[data-state][class*='origin-top-center']")).not.toBeNull();
  });

  it("moves focus between triggers with the arrow, Home and End keys", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const states = screen.getByRole("button", { name: "States" });
    const provinces = screen.getByRole("button", { name: "Provinces" });
    states.focus();
    await user.keyboard("{ArrowRight}");
    expect(provinces).toHaveFocus();
    await user.keyboard("{Home}");
    expect(states).toHaveFocus();
    await user.keyboard("{End}");
    expect(provinces).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("link", { name: "Ontario" })).toBeInTheDocument();
  });

  it("shows the indicator once the trigger has been measured", async () => {
    class ImmediateRO {
      constructor(private cb: ResizeObserverCallback) {}
      observe() {
        this.cb([], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = ImmediateRO as unknown as typeof ResizeObserver;
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "States" }));
    await screen.findByRole("link", { name: "Oregon" });
    const indicator = await screen.findByText((_, el) => !!el?.classList.contains("ind-x"));
    expect(indicator).toHaveClass("top-full", "ind-x");
    expect(indicator.querySelector(".rotate-45")).not.toBeNull();
  });
});
