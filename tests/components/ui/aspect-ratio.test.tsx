import { render, screen } from "@testing-library/react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

describe("AspectRatio", () => {
  it("sizes its wrapper from the ratio", () => {
    render(
      <AspectRatio ratio={2}>
        <span>inside</span>
      </AspectRatio>,
    );
    const wrapper = screen.getByText("inside").parentElement?.parentElement as HTMLElement;
    expect(wrapper.style.paddingBottom).toBe("50%");
  });
});
