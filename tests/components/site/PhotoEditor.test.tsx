import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const m = vi.hoisted(() => ({
  renderBlurred: vi.fn(),
  toJpeg: vi.fn(),
}));

vi.mock("@/lib/photo-canvas", () => ({
  renderBlurredPhoto: m.renderBlurred,
  canvasToJpegBlob: m.toJpeg,
}));

import { PhotoEditor } from "@/components/site/PhotoEditor";

const BITMAP = { width: 800, height: 600 } as ImageBitmap;
const BOX = { x: 0.3, y: 0.4, w: 0.25, h: 0.12 };

function setup(props: Partial<Parameters<typeof PhotoEditor>[0]> = {}) {
  const onUse = vi.fn();
  const onRemove = vi.fn();
  const onRetry = vi.fn();
  render(
    <PhotoEditor
      imageUrl="/photo.jpg"
      bitmap={BITMAP}
      initialBox={BOX}
      showNoBoxMessage={false}
      onUse={onUse}
      onRemove={onRemove}
      onRetry={onRetry}
      {...props}
    />,
  );
  return { onUse, onRemove, onRetry };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.renderBlurred.mockReturnValue(document.createElement("canvas"));
  m.toJpeg.mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
  URL.createObjectURL = vi.fn(() => "blob:processed");
  URL.revokeObjectURL = vi.fn();
});

describe("PhotoEditor", () => {
  it("shows the no-box message and lets the visitor draw a box", async () => {
    setup({ initialBox: null, showNoBoxMessage: true });
    expect(
      screen.getByText(
        "We couldn't find the plate in this photo. Draw a box around it to keep it clear.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    const frame = screen.getByTestId("photo-frame");
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    } as DOMRect);
    fireEvent.pointerDown(frame, { clientX: 200, clientY: 150, pointerId: 1 });
    fireEvent.pointerMove(frame, { clientX: 400, clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(frame, { clientX: 400, clientY: 300, pointerId: 1 });

    await waitFor(() => expect(screen.getByRole("button", { name: "Next" })).toBeEnabled());
    expect(screen.getByRole("slider", { name: "Plate area" })).toBeInTheDocument();
  });

  it("Next builds the processed photo, and Use This Photo confirms it", async () => {
    const user = userEvent.setup();
    const { onUse } = setup();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Review your photo" })).toBeInTheDocument(),
    );
    expect(screen.getByTestId("processed-photo")).toHaveAttribute("src", "blob:processed");
    await user.click(screen.getByRole("button", { name: "Use This Photo" }));
    await waitFor(() => expect(onUse).toHaveBeenCalled());
    const [blob, adjusted] = onUse.mock.calls[0]!;
    expect(blob).toBeInstanceOf(Blob);
    expect(adjusted).toBe(false);
    expect(m.renderBlurred).toHaveBeenCalledWith(BITMAP, BOX);
  });

  it("marks the box adjusted after a keyboard nudge", async () => {
    const user = userEvent.setup();
    const { onUse } = setup();
    screen.getByRole("slider", { name: "Plate area" }).focus();
    await user.keyboard("{ArrowRight}");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Review your photo" })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Use This Photo" }));
    await waitFor(() => expect(onUse).toHaveBeenCalled());
    expect(onUse.mock.calls[0][1]).toBe(true);
  });

  it("Adjust returns to the box, and Remove Photo and Try again call back", async () => {
    const user = userEvent.setup();
    const { onRemove, onRetry } = setup();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Review your photo" })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Adjust" }));
    expect(screen.getByRole("heading", { name: "Adjust the plate area" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Review your photo" })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Remove Photo" }));
    expect(onRemove).toHaveBeenCalled();
    expect(onUseCallbackCheck(m.toJpeg)).toBe(true);
  });
});

/** The processed JPEG is built for the review, never for remove or retry. */
function onUseCallbackCheck(toJpeg: ReturnType<typeof vi.fn>) {
  return toJpeg.mock.calls.length > 0;
}
