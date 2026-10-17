import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const m = vi.hoisted(() => ({
  decode: vi.fn(),
  renderBlurred: vi.fn(),
  toJpeg: vi.fn(),
}));

vi.mock("@/lib/photo-canvas", () => ({
  decodePhoto: m.decode,
  renderBlurredPhoto: m.renderBlurred,
  canvasToJpegBlob: m.toJpeg,
}));

import { Route } from "@/routes/previews_.story-photo";

const Component = Route.options.component!;

beforeEach(() => {
  vi.clearAllMocks();
  m.decode.mockResolvedValue({ width: 800, height: 600 });
  m.renderBlurred.mockResolvedValue(undefined);
  m.toJpeg.mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    filter: "",
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  URL.createObjectURL = vi.fn(() => "blob:mock");
  global.fetch = vi.fn(async () => ({ blob: async () => new Blob(["x"]) }) as Response);
});

describe("/previews/story-photo", () => {
  it("has no loader, so it never reads live data", () => {
    expect(Route.options.loader).toBeUndefined();
  });

  it("offers the three editor states over the sample photo", async () => {
    render(<Component />);
    expect(screen.getByRole("heading", { name: "Story photo, sample data" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Suggested box" })).toBeEnabled(),
    );
    expect(screen.getByRole("button", { name: "No box found" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Review" })).toBeEnabled();
  });

  it("opens the real editor in the no-box state", async () => {
    const user = userEvent.setup();
    render(<Component />);
    await waitFor(() => expect(screen.getByRole("button", { name: "No box found" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "No box found" }));
    expect(screen.getByRole("heading", { name: "Adjust the plate area" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "We couldn't find the plate in this photo. Draw a box around it to keep it clear.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose another photo" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Skip photo" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Choose another photo" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skip photo" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
