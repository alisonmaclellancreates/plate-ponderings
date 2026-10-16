import { render, screen } from "@testing-library/react";
import { Toaster } from "@/components/ui/sonner";

describe("Toaster", () => {
  it("mounts a notification region and passes props through", () => {
    render(<Toaster position="top-center" />);
    expect(screen.getByRole("region")).toBeInTheDocument();
  });
});
