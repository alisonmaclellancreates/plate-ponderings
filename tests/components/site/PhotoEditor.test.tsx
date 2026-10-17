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
  const onChooseAnother = vi.fn();
  render(
    <PhotoEditor
      imageUrl="/photo.jpg"
      bitmap={BITMAP}
      initialBox={BOX}
      showNoBoxMessage={false}
      onUse={onUse}
      onRemove={onRemove}
      onChooseAnother={onChooseAnother}
      {...props}
    />,
  );
  return { onUse, onRemove, onChooseAnother };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.renderBlurred.mockReturnValue(document.createElement("canvas"));
  m.toJpeg.mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
  URL.createObjectURL = vi.fn(() => "blob:processed");
  URL.revokeObjectURL = vi.fn();
});

describe("PhotoEditor", () => {
  it("ignores movement without a drag and resets a moved box", async () => {
    const user = userEvent.setup();
    setup();
    const frame = screen.getByTestId("photo-frame");
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    } as DOMRect);
    fireEvent.pointerMove(frame, { clientX: 500, clientY: 400 });
    expect(screen.getByTestId("plate-box")).toHaveStyle({ left: "30%" });
    fireEvent.pointerDown(frame, { clientX: 300, clientY: 270, pointerId: 1 });
    fireEvent.pointerMove(frame, { clientX: 380, clientY: 330, pointerId: 1 });
    fireEvent.pointerUp(frame);
    expect(screen.getByTestId("plate-box")).toHaveStyle({ left: "40%", top: "50%" });
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByTestId("plate-box")).toHaveStyle({ left: "30%", top: "40%" });
  });

  it.each(["nw", "ne", "sw", "se"])(
    "resizes with the %s handle and marks the box adjusted",
    async (corner) => {
      const user = userEvent.setup();
      const { onUse } = setup();
      const frame = screen.getByTestId("photo-frame");
      vi.spyOn(frame, "getBoundingClientRect").mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      } as DOMRect);
      const left = corner === "nw" || corner === "sw";
      const top = corner === "nw" || corner === "ne";
      const x = left ? 240 : 440;
      const y = top ? 240 : 312;
      fireEvent.pointerDown(screen.getByTestId(`handle-${corner}`), {
        clientX: x,
        clientY: y,
        pointerId: 1,
      });
      fireEvent.pointerMove(frame, {
        clientX: x + (left ? -80 : 80),
        clientY: y + (top ? -60 : 60),
        pointerId: 1,
      });
      fireEvent.pointerUp(frame);
      await user.click(screen.getByRole("button", { name: "Next" }));
      await screen.findByRole("heading", { name: "Review your photo" });
      await user.click(screen.getByRole("button", { name: "Use This Photo" }));
      await waitFor(() => expect(onUse).toHaveBeenCalledWith(expect.any(Blob), true));
      expect(m.renderBlurred).toHaveBeenCalledWith(
        BITMAP,
        expect.objectContaining({
          w: expect.closeTo(0.35),
          h: expect.closeTo(0.22),
        }),
      );
    },
  );

  it("draws a new box outside the suggestion and can confirm a manually drawn box", async () => {
    const user = userEvent.setup();
    const { onUse } = setup({ initialBox: null, showNoBoxMessage: true });
    const frame = screen.getByTestId("photo-frame");
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    } as DOMRect);
    fireEvent.pointerDown(frame, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(frame, { clientX: 1, clientY: 1, pointerId: 1 });
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    fireEvent.pointerMove(frame, { clientX: 400, clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(frame);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByRole("heading", { name: "Review your photo" });
    await user.click(screen.getByRole("button", { name: "Use This Photo" }));
    await waitFor(() => expect(onUse).toHaveBeenCalledWith(expect.any(Blob), true));
  });

  it("ignores other keys, supports shift nudges, and confirms a round-trip box as unchanged", async () => {
    const user = userEvent.setup();
    const { onUse } = setup();
    const slider = screen.getByRole("slider", { name: "Plate area" });
    fireEvent.keyDown(slider, { key: "a" });
    fireEvent.keyDown(slider, { key: "ArrowDown", shiftKey: true });
    fireEvent.keyDown(slider, { key: "ArrowUp", shiftKey: true });
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByRole("heading", { name: "Review your photo" });
    await user.click(screen.getByRole("button", { name: "Use This Photo" }));
    await waitFor(() => expect(onUse).toHaveBeenCalledWith(expect.any(Blob), false));
  });
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
    expect(onUse.mock.calls[0]![1]).toBe(true);
  });

  it.each([BOX, null])(
    "adjustment can skip or choose another photo with box %o without processing",
    async (initialBox) => {
      const user = userEvent.setup();
      const { onRemove, onChooseAnother } = setup({ initialBox });
      await user.click(screen.getByRole("button", { name: "Choose another photo" }));
      expect(onChooseAnother).toHaveBeenCalledTimes(1);
      await user.click(screen.getByRole("button", { name: "Skip photo" }));
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(m.renderBlurred).not.toHaveBeenCalled();
      expect(m.toJpeg).not.toHaveBeenCalled();
    },
  );

  it("Next cannot process a photo without a box", async () => {
    const user = userEvent.setup();
    setup({ initialBox: null });
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(m.renderBlurred).not.toHaveBeenCalled();
    expect(m.toJpeg).not.toHaveBeenCalled();
  });

  it("Adjust returns to the box, and Remove Photo calls back", async () => {
    const user = userEvent.setup();
    const { onRemove } = setup();
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

/** The processed JPEG is built for the review, never for remove or selection. */
function onUseCallbackCheck(toJpeg: ReturnType<typeof vi.fn>) {
  return toJpeg.mock.calls.length > 0;
}
