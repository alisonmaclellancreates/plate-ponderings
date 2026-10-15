import { render, screen } from "@testing-library/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

describe("Avatar", () => {
  it("shows the fallback while the image has not loaded", () => {
    const { container } = render(
      <Avatar className="avatar-x">
        <AvatarImage src="https://example.com/a.png" alt="Alison" className="img-x" />
        <AvatarFallback className="fb-x">AM</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("AM")).toHaveClass("rounded-full", "fb-x");
    expect(container.firstElementChild).toHaveClass("h-10", "avatar-x");
    expect(screen.queryByRole("img")).toBeNull();
  });
});
