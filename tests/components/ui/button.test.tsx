import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders a clickable button with default variant and merged className", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button className="btn-x" onClick={onClick}>
        Save
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn).toHaveClass("bg-primary", "h-9", "btn-x");
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  it("applies a non-default variant and size", () => {
    render(
      <Button variant="outline" size="sm">
        Small
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Small" })).toHaveClass("border-input", "h-8");
  });
  it("renders its child element when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/plates">Plates</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Plates" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveClass("bg-primary");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
