import { afterEach, describe, expect, it, vi } from "vitest";
import {
  blobToDataUrl,
  canvasToJpegBlob,
  decodePhoto,
  renderBlurredPhoto,
  toDetectDataUrl,
} from "@/lib/photo-canvas";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockCanvases() {
  const contexts = Array.from({ length: 2 }, () => ({
    drawImage: vi.fn(),
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
  }));
  const canvases = contexts.map((context) => ({
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toDataURL: vi.fn(() => "data:image/jpeg;base64,processed"),
  }));
  const create = vi.spyOn(document, "createElement");
  for (const canvas of canvases) create.mockReturnValueOnce(canvas as unknown as HTMLCanvasElement);
  return { canvases, contexts };
}

describe("photo canvas", () => {
  it("decodes with EXIF orientation and propagates unreadable input", async () => {
    const decode = vi.fn().mockRejectedValue(new Error("unreadable"));
    vi.stubGlobal("createImageBitmap", decode);
    const file = new Blob(["invalid"]);
    await expect(decodePhoto(file)).rejects.toThrow("unreadable");
    expect(decode).toHaveBeenCalledWith(file, { imageOrientation: "from-image" });
  });

  it("draws a 1024px detection copy and encodes JPEG at quality 0.85", () => {
    const { canvases, contexts } = mockCanvases();
    const bitmap = { width: 4096, height: 2048 } as ImageBitmap;
    expect(toDetectDataUrl(bitmap)).toBe("data:image/jpeg;base64,processed");
    expect(canvases[0]).toMatchObject({ width: 1024, height: 512 });
    expect(contexts[0]?.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1024, 512);
    expect(canvases[0]?.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.85);
  });

  it("caps the export at 1600px, blurs pixels then draws the sharp crop", () => {
    const { canvases, contexts } = mockCanvases();
    const bitmap = { width: 3200, height: 1600 } as ImageBitmap;
    const canvas = renderBlurredPhoto(bitmap, { x: 0.25, y: 0.5, w: 0.5, h: 0.25 });
    expect(canvas).toBe(canvases[0]);
    expect(canvas).toMatchObject({ width: 1600, height: 800 });
    expect(canvases[1]).toMatchObject({ width: 67, height: 33 });
    expect(contexts[1]?.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 67, 33);
    expect(contexts[0]).toMatchObject({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
    expect(contexts[0]?.drawImage.mock.calls).toEqual([
      [canvases[1], 0, 0, 1600, 800],
      [bitmap, 800, 800, 1600, 400, 400, 400, 800, 200],
    ]);
  });

  it("keeps the tiny blur canvas at least one pixel without enlarging small images", () => {
    const { canvases } = mockCanvases();
    renderBlurredPhoto({ width: 12, height: 6 } as ImageBitmap, { x: 0, y: 0, w: 1, h: 1 });
    expect(canvases[0]).toMatchObject({ width: 12, height: 6 });
    expect(canvases[1]).toMatchObject({ width: 1, height: 1 });
  });

  it("exports the re-encoded JPEG at quality 0.9", async () => {
    const blob = new Blob(["processed"], { type: "image/jpeg" });
    const toBlob = vi.fn((callback: BlobCallback) => callback(blob));
    await expect(canvasToJpegBlob({ toBlob } as unknown as HTMLCanvasElement)).resolves.toBe(blob);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.9);
  });

  it("rejects a failed JPEG encoding", async () => {
    const toBlob = vi.fn((callback: BlobCallback) => callback(null));
    await expect(canvasToJpegBlob({ toBlob } as unknown as HTMLCanvasElement)).rejects.toThrow(
      "Could not encode photo",
    );
  });

  it("reads the encoded blob as a data URL", async () => {
    await expect(blobToDataUrl(new Blob(["abc"], { type: "image/jpeg" }))).resolves.toBe(
      "data:image/jpeg;base64,YWJj",
    );
  });

  it("rejects a failed blob read", async () => {
    class FailedReader {
      onerror?: () => void;
      readAsDataURL() {
        this.onerror?.();
      }
    }
    vi.stubGlobal("FileReader", FailedReader);
    await expect(blobToDataUrl(new Blob())).rejects.toThrow("Could not read photo");
  });
});