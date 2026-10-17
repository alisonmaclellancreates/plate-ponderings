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

function stubCanvas() {
  const ctx = { filter: "", drawImage: vi.fn(), canvas: null };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  vi.stubGlobal("createImageBitmap", vi.fn(async () => BITMAP));
  URL.createObjectURL = vi.fn(() => "blob:mock");
}

function setup(props: Partial<Parameters<typeof PhotoEditor>[0]> = {}) {
  const onUse = vi.fn();
  const onRemove = vi.fn();
  const onRetry = vi.fn();
  render(
    <PhotoEditor
      imageUrl="/photo.jpg"
      bitmap={BITMAP}
      initialBox={BOX}
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
  stubCanvas();
  m.renderBlurred.mockResolvedValue(undefined);
  m.toJpeg.mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
});

describe("PhotoEditor", () => {
  it("shows the no-box message and lets the visitor draw a box", async () => {
    setup({ initialBox: null, showNoBoxMessage: true });
    expect(
      screen.getByText("We couldn't find the plate in this photo. Draw a box around it to keep it clear."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).toBeNull();

    const canvas = document.querySelector("canvas")!;
    const wrap = canvas.parentElement!;
    vi.spyOn(wrap, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    } as DOMRect);
    fireEvent.pointerDown(wrap, { clientX: 200, clientY: 150, pointerId: 1 });
    fireEvent.pointerMove(wrap, { clientX: 400, clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(wrap, { clientX: 400, clientY: 300, pointerId: 1 });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument(),
    );
  });

  it("confirms with the processed photo and reports the box and adjustment", async () => {
    const user = userEvent.setup();
    const { onUse } = setup();
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(onUse).toHaveBeenCalled());
    const [dataUrl, box, adjusted] = onUse.mock.calls[0];
    expect(dataUrl).toMatch(/^data:image\/jpeg/);
    expect(box).toEqual(BOX);
    expect(adjusted).toBe(false);
    expect(m.renderBlurred).toHaveBeenCalledWith(BITMAP, BOX);
  });

  it("marks the box adjusted after a keyboard nudge", async () => {
    const user = userEvent.setup();
    const { onUse } = setup();
    const box = screen.getByRole("application");
    box.focus();
    await user.keyboard("{ArrowRight}");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(onUse).toHaveBeenCalled());
    const [, movedBox, adjusted] = onUse.mock.calls[0];
    expect(adjusted).toBe(true);
    expect(movedBox.x).toBeCloseTo(BOX.x + 0.01);
  });

  it("remove and retry call back without uploading anything", async () => {
    const user = userEvent.setup();
    const { onRemove, onRetry } = setup();
    await user.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(onRemove).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
    expect(m.toJpeg).not.toHaveBeenCalled();
  });
});
