import { render, screen } from "@testing-library/react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

describe("Resizable", () => {
  it("renders panels and a grip only when withHandle is set", () => {
    const { container } = render(
      <ResizablePanelGroup orientation="horizontal" className="group-x">
        <ResizablePanel>Left</ResizablePanel>
        <ResizableHandle withHandle className="handle-x" />
        <ResizablePanel>Middle</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>Right</ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(container.firstElementChild).toHaveClass("flex", "group-x");
    expect(screen.getByText("Left")).toBeInTheDocument();
    const [withGrip, plain] = screen.getAllByRole("separator");
    expect(withGrip).toHaveClass("handle-x");
    expect(withGrip?.querySelector("svg")).not.toBeNull();
    expect(plain?.querySelector("svg")).toBeNull();
  });
  it("supports a vertical group", () => {
    render(
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel>Top</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>Bottom</ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "horizontal");
  });
});
