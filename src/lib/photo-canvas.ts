/**
 * Browser canvas work for story photos. The original is decoded once with its
 * EXIF rotation applied; the detection copy and the blurred export both come
 * from that single decoded image. Only the blurred, re-encoded JPEG leaves
 * the browser for storage.
 */
import { boxToPixels, DETECT_MAX_SIDE, EXPORT_MAX_SIDE, fitWithin, type Box } from "./photo-blur";

/** Decode a photo with EXIF rotation applied. Rejects unreadable files. */
export async function decodePhoto(file: Blob): Promise<ImageBitmap> {
  return await createImageBitmap(file, { imageOrientation: "from-image" });
}

function drawScaled(bitmap: ImageBitmap, maxSide: number): HTMLCanvasElement {
  const { w, h } = fitWithin(bitmap.width, bitmap.height, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return canvas;
}

/** A downscaled JPEG data URL of the decoded image, for box detection only. */
export function toDetectDataUrl(bitmap: ImageBitmap): string {
  return drawScaled(bitmap, DETECT_MAX_SIDE).toDataURL("image/jpeg", 0.85);
}

/**
 * The processed photo: everything outside the box heavily blurred, the box
 * sharp. The blur is drawn into the pixels (repeated downscale), never a CSS
 * effect over the original. Longest side is at most EXPORT_MAX_SIDE.
 */
export function renderBlurredPhoto(bitmap: ImageBitmap, box: Box): HTMLCanvasElement {
  const { w, h } = fitWithin(bitmap.width, bitmap.height, EXPORT_MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Heavy blur: draw the image tiny, then back up with smoothing.
  const tiny = document.createElement("canvas");
  tiny.width = Math.max(1, Math.round(w / 24));
  tiny.height = Math.max(1, Math.round(h / 24));
  tiny.getContext("2d")!.drawImage(bitmap, 0, 0, tiny.width, tiny.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(tiny, 0, 0, w, h);

  // The sharp plate area, from the decoded original.
  const scaleX = bitmap.width / w;
  const scaleY = bitmap.height / h;
  const px = boxToPixels(box, w, h);
  ctx.drawImage(
    bitmap,
    Math.round(px.x * scaleX),
    Math.round(px.y * scaleY),
    Math.round(px.w * scaleX),
    Math.round(px.h * scaleY),
    px.x,
    px.y,
    px.w,
    px.h,
  );
  return canvas;
}

/** Export a canvas as a JPEG blob; re-encoding drops location and camera data. */
export function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode photo"))),
      "image/jpeg",
      0.9,
    );
  });
}

/** Read a blob as a base64 data URL, for sending to a server function. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read photo"));
    reader.readAsDataURL(blob);
  });
}
