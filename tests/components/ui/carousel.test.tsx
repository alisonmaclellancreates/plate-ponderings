import { act, fireEvent, render, screen } from "@testing-library/react";

const handlers: Record<string, (api: unknown) => void> = {};
const api = {
  canScrollPrev: vi.fn(() => false),
  canScrollNext: vi.fn(() => true),
  scrollPrev: vi.fn(),
  scrollNext: vi.fn(),
  on: vi.fn((e: string, cb: (a: unknown) => void) => {
    handlers[e] = cb;
  }),
  off: vi.fn(),
};
const emblaOpts: unknown[] = [];

vi.mock("embla-carousel-react", () => ({
  default: (opts: unknown) => {
    emblaOpts.push(opts);
    return [vi.fn(), api];
  },
}));

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

function Full(props: React.ComponentProps<typeof Carousel>) {
  return (
    <Carousel {...props}>
      <CarouselContent className="content-x">
        <CarouselItem>One</CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}

afterEach(() => {
  vi.clearAllMocks();
  emblaOpts.length = 0;
  api.canScrollPrev.mockImplementation(() => false);
  api.canScrollNext.mockImplementation(() => true);
});

describe("Carousel", () => {
  it("renders horizontal by default and passes axis x", () => {
    render(<Full opts={{ loop: true }} />);
    expect(emblaOpts[0]).toEqual({ loop: true, axis: "x" });
    expect(screen.getByRole("region")).toHaveAttribute("aria-roledescription", "carousel");
    expect(screen.getByText("One")).toHaveClass("pl-4");
    expect(screen.getByText("One").parentElement).toHaveClass("-ml-4", "content-x");
    expect(screen.getByRole("button", { name: "Previous slide" })).toHaveClass("-left-12");
    expect(screen.getByRole("button", { name: "Next slide" })).toHaveClass("-right-12");
  });

  it("renders vertical with axis y", () => {
    render(<Full orientation="vertical" />);
    expect(emblaOpts[0]).toEqual({ axis: "y" });
    expect(screen.getByText("One")).toHaveClass("pt-4");
    expect(screen.getByText("One").parentElement).toHaveClass("flex-col");
    expect(screen.getByRole("button", { name: "Previous slide" })).toHaveClass("-top-12");
    expect(screen.getByRole("button", { name: "Next slide" })).toHaveClass("-bottom-12");
  });

  it("disables buttons per the API and calls scroll on click", () => {
    render(<Full />);
    const prev = screen.getByRole("button", { name: "Previous slide" });
    const next = screen.getByRole("button", { name: "Next slide" });
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(api.scrollNext).toHaveBeenCalledTimes(1);
    api.canScrollPrev.mockImplementation(() => true);
    api.canScrollNext.mockImplementation(() => false);
    act(() => handlers["select"]?.(api));
    expect(prev).toBeEnabled();
    expect(next).toBeDisabled();
    fireEvent.click(prev);
    expect(api.scrollPrev).toHaveBeenCalledTimes(1);
  });

  it("scrolls with arrow keys and ignores others", () => {
    render(<Full />);
    const region = screen.getByRole("region");
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    fireEvent.keyDown(region, { key: "ArrowRight" });
    fireEvent.keyDown(region, { key: "Enter" });
    expect(api.scrollPrev).toHaveBeenCalledTimes(1);
    expect(api.scrollNext).toHaveBeenCalledTimes(1);
  });

  it("passes the API to setApi and subscribes / unsubscribes", () => {
    const setApi = vi.fn();
    const { unmount } = render(<Full setApi={setApi} />);
    expect(setApi).toHaveBeenCalledWith(api);
    expect(api.on).toHaveBeenCalledWith("reInit", expect.any(Function));
    expect(api.on).toHaveBeenCalledWith("select", expect.any(Function));
    unmount();
    expect(api.off).toHaveBeenCalledWith("select", handlers["select"]);
  });

  it("throws when a part renders outside a carousel", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => render(<CarouselItem />)).toThrow("useCarousel must be used within a <Carousel />");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("Carousel without an API", () => {
  afterEach(() => {
    vi.doUnmock("embla-carousel-react");
    vi.resetModules();
  });

  it("stays disabled, and scroll calls are no-ops", async () => {
    vi.resetModules();
    vi.doMock("embla-carousel-react", () => ({ default: () => [vi.fn(), undefined] }));
    const m = await import("@/components/ui/carousel");
    const setApi = vi.fn();
    render(
      <m.Carousel setApi={setApi}>
        <m.CarouselContent />
        <m.CarouselPrevious />
        <m.CarouselNext />
      </m.Carousel>,
    );
    expect(setApi).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowLeft" });
    expect(api.scrollNext).not.toHaveBeenCalled();
  });
});
