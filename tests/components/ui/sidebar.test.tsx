import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({
    children,
    hidden,
    className,
  }: {
    children?: React.ReactNode;
    hidden?: boolean;
    className?: string;
  }) => (hidden ? null : <div data-testid="tip" className={className}>{children}</div>),
}));

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

function clearCookie() {
  document.cookie = "sidebar_state=; path=/; max-age=0";
}

function State() {
  const { state } = useSidebar();
  return <span data-testid="state">{state}</span>;
}

function sidebarRoot(container: HTMLElement) {
  return container.querySelector(".group.peer") as HTMLElement;
}

afterEach(() => {
  clearCookie();
});

describe("SidebarProvider state", () => {
  it("toggles uncontrolled via trigger and rail and writes the cookie", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <SidebarProvider className="wrap-x" style={{ color: "red" }}>
        <Sidebar>
          <SidebarRail />
        </Sidebar>
        <SidebarTrigger onClick={onClick} />
        <State />
      </SidebarProvider>,
    );
    expect(screen.getByTestId("state")).toHaveTextContent("expanded");
    const byKind = (k: string) =>
      screen.getAllByRole("button", { name: "Toggle Sidebar" }).find((b) => b.dataset["sidebar"] === k)!;
    await user.click(byKind("trigger"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    expect(document.cookie).toContain("sidebar_state=false");
    await user.click(byKind("rail"));
    expect(screen.getByTestId("state")).toHaveTextContent("expanded");
    expect(document.cookie).toContain("sidebar_state=true");
  });

  it("honours defaultOpen=false", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <State />
      </SidebarProvider>,
    );
    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
  });

  it("delegates to onOpenChange in controlled mode", () => {
    const onOpenChange = vi.fn();
    render(
      <SidebarProvider open={false} onOpenChange={onOpenChange}>
        <SidebarTrigger />
        <State />
      </SidebarProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
  });

  it("accepts a plain value through setOpen", () => {
    function Closer() {
      const { setOpen } = useSidebar();
      return <button onClick={() => setOpen(false)}>close</button>;
    }
    render(
      <SidebarProvider>
        <Closer />
        <State />
      </SidebarProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "close" }));
    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
  });

  it("toggles on Ctrl/Cmd+B and ignores other keys", () => {
    render(
      <SidebarProvider>
        <State />
      </SidebarProvider>,
    );
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(screen.getByTestId("state")).toHaveTextContent("collapsed");
    fireEvent.keyDown(window, { key: "b", metaKey: true });
    expect(screen.getByTestId("state")).toHaveTextContent("expanded");
    fireEvent.keyDown(window, { key: "b" });
    fireEvent.keyDown(window, { key: "x", ctrlKey: true });
    expect(screen.getByTestId("state")).toHaveTextContent("expanded");
  });

  it("throws when useSidebar is used outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      if (String(args[0]).includes("useSidebar must be used")) return;
      if (args.some((a) => String(a).includes("useSidebar must be used"))) return;
    });
    try {
      expect(() => render(<State />)).toThrow("useSidebar must be used within a SidebarProvider.");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("Sidebar layout", () => {
  it("renders a plain element for collapsible=none", () => {
    render(
      <SidebarProvider>
        <Sidebar collapsible="none" className="none-x" data-testid="plain">
          body
        </Sidebar>
      </SidebarProvider>,
    );
    const el = screen.getByTestId("plain");
    expect(el).toHaveClass("none-x");
    expect(el).not.toHaveAttribute("data-state");
    expect(el).toHaveTextContent("body");
  });

  it.each([
    ["offcanvas", "left", "sidebar"],
    ["icon", "right", "floating"],
    ["icon", "left", "inset"],
  ] as const)("collapsible=%s side=%s variant=%s", (collapsible, side, variant) => {
    const { container } = render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar collapsible={collapsible} side={side} variant={variant} className="inner-x">
          x
        </Sidebar>
      </SidebarProvider>,
    );
    const root = sidebarRoot(container);
    expect(root).toHaveAttribute("data-collapsible", collapsible);
    expect(root).toHaveAttribute("data-side", side);
    expect(root).toHaveAttribute("data-variant", variant);
    expect(root).toHaveAttribute("data-state", "collapsed");
    const panel = container.querySelector(".inner-x")!;
    expect(panel).toHaveClass(side === "left" ? "left-0" : "right-0");
    if (variant === "sidebar") expect(panel.className).toContain("border-r");
    else expect(panel).toHaveClass("p-2");
  });

  it("leaves data-collapsible empty when expanded", () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar>x</Sidebar>
      </SidebarProvider>,
    );
    expect(sidebarRoot(container)).toHaveAttribute("data-collapsible", "");
  });
});

describe("SidebarMenuButton tooltip", () => {
  it("shows a string tooltip when collapsed", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <SidebarMenuButton tooltip="Home">H</SidebarMenuButton>
      </SidebarProvider>,
    );
    expect(screen.getByTestId("tip")).toHaveTextContent("Home");
  });

  it("accepts tooltip props", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <SidebarMenuButton tooltip={{ children: "Plates", className: "tt-x" }}>P</SidebarMenuButton>
      </SidebarProvider>,
    );
    expect(screen.getByTestId("tip")).toHaveClass("tt-x");
    expect(screen.getByTestId("tip")).toHaveTextContent("Plates");
  });

  it("hides the tooltip when expanded", () => {
    render(
      <SidebarProvider>
        <SidebarMenuButton tooltip="Home">H</SidebarMenuButton>
      </SidebarProvider>,
    );
    expect(screen.queryByTestId("tip")).toBeNull();
  });

  it("renders no tooltip when none given, with variants", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <SidebarMenuButton isActive size="lg" variant="outline">
          A
        </SidebarMenuButton>
        <SidebarMenuButton size="sm">B</SidebarMenuButton>
        <SidebarMenuButton asChild>
          <a href="#c">C</a>
        </SidebarMenuButton>
      </SidebarProvider>,
    );
    expect(screen.queryByTestId("tip")).toBeNull();
    const a = screen.getByRole("button", { name: "A" });
    expect(a).toHaveAttribute("data-size", "lg");
    expect(a).toHaveAttribute("data-active", "true");
    expect(a).toHaveClass("h-12");
    expect(screen.getByRole("button", { name: "B" })).toHaveClass("h-7");
    expect(screen.getByRole("link", { name: "C" })).toHaveAttribute("data-sidebar", "menu-button");
  });
});

describe("Sidebar on mobile", () => {
  afterEach(() => {
    vi.doUnmock("@/hooks/use-mobile");
    vi.resetModules();
  });

  async function loadMobile() {
    vi.resetModules();
    vi.doMock("@/hooks/use-mobile", () => ({ useIsMobile: () => true }));
    vi.doMock("@/components/ui/tooltip", () => ({
      TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      TooltipContent: ({ children, hidden }: { children?: React.ReactNode; hidden?: boolean }) =>
        hidden ? null : <div data-testid="tip">{children}</div>,
    }));
    return import("@/components/ui/sidebar");
  }

  it("renders in a sheet that the trigger opens, and hides tooltips", async () => {
    const m = await loadMobile();
    render(
      <m.SidebarProvider defaultOpen={false}>
        <m.Sidebar side="right">
          <span>Mobile body</span>
          <m.SidebarMenuButton tooltip="Tip">X</m.SidebarMenuButton>
        </m.Sidebar>
        <m.SidebarTrigger />
      </m.SidebarProvider>,
    );
    expect(screen.queryByText("Mobile body")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    const dialog = await screen.findByRole("dialog", { name: "Sidebar" });
    expect(dialog).toHaveAttribute("data-mobile", "true");
    expect(dialog).toHaveClass("right-0");
    expect(screen.getByText("Mobile body")).toBeInTheDocument();
    expect(screen.queryByTestId("tip")).toBeNull();
  });
});

describe("Sidebar parts", () => {
  it("renders every remaining part with its data attribute", () => {
    const { container } = render(
      <SidebarProvider>
        <SidebarInset>
          <SidebarHeader>h</SidebarHeader>
          <SidebarInput placeholder="search" />
          <SidebarSeparator />
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Label</SidebarGroupLabel>
              <SidebarGroupLabel asChild>
                <h2>AsLabel</h2>
              </SidebarGroupLabel>
              <SidebarGroupAction>act</SidebarGroupAction>
              <SidebarGroupAction asChild>
                <a href="#g">gact</a>
              </SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuAction showOnHover>ma</SidebarMenuAction>
                    <SidebarMenuAction asChild>
                      <a href="#m">mact</a>
                    </SidebarMenuAction>
                    <SidebarMenuBadge>3</SidebarMenuBadge>
                    <SidebarMenuSkeleton />
                    <SidebarMenuSkeleton showIcon data-testid="sk-icon" />
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton href="#a">md</SidebarMenuSubButton>
                        <SidebarMenuSubButton size="sm" isActive href="#b">
                          sm
                        </SidebarMenuSubButton>
                        <SidebarMenuSubButton asChild>
                          <button>sb</button>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>f</SidebarFooter>
        </SidebarInset>
      </SidebarProvider>,
    );
    const q = (k: string) => container.querySelectorAll(`[data-sidebar="${k}"]`);
    expect(container.querySelector("main")).toHaveClass("bg-background");
    for (const k of ["header", "footer", "content", "group", "group-content", "menu", "menu-item", "menu-badge", "menu-sub", "separator", "input"]) {
      expect(q(k).length).toBe(1);
    }
    expect(screen.getByRole("heading", { name: "AsLabel" })).toHaveAttribute("data-sidebar", "group-label");
    expect(screen.getByRole("link", { name: "gact" })).toHaveAttribute("data-sidebar", "group-action");
    expect(screen.getByRole("button", { name: "ma" }).className).toContain("md:opacity-0");
    expect(screen.getByRole("link", { name: "mact" }).className).not.toContain("md:opacity-0");
    expect(q("menu-skeleton").length).toBe(2);
    expect(q("menu-skeleton-icon").length).toBe(1);
    expect(screen.getByTestId("sk-icon").querySelector('[data-sidebar="menu-skeleton-icon"]')).not.toBeNull();
    expect(q("menu-skeleton-text").length).toBe(2);
    expect(screen.getByRole("link", { name: "md" })).toHaveAttribute("data-size", "md");
    expect(screen.getByRole("link", { name: "md" })).toHaveClass("text-sm");
    expect(screen.getByRole("link", { name: "sm" })).toHaveClass("text-xs");
    expect(screen.getByRole("link", { name: "sm" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("button", { name: "sb" })).toHaveAttribute("data-sidebar", "menu-sub-button");
  });
});
