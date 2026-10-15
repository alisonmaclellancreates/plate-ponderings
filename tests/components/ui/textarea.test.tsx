import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "@/components/ui/textarea";

describe("Textarea", () => {
  it("accepts typing and merges className", async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Story" className="ta-x" />);
    const ta = screen.getByRole("textbox", { name: "Story" });
    expect(ta.tagName).toBe("TEXTAREA");
    expect(ta).toHaveClass("ta-x");
    await user.type(ta, "It means later");
    expect(ta).toHaveValue("It means later");
  });
});
