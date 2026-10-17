/**
 * Pure photo-box maths and JPEG checks for the story photo flow. No DOM here,
 * so every rule is unit-testable; canvas work lives in photo-canvas.ts.
 *
 * Boxes are fractions of the displayed image (EXIF rotation already applied),
 * so a box is independent of pixel size and rotation.
 */
export type Box = { x: number; y: number; w: number; h: number };

/** Smallest box edge, as a fraction of the image side it is measured against. */
export const MIN_BOX = 0.05;
/** Longest side of the exported JPEG, in pixels. */
export const EXPORT_MAX_SIDE = 1600;
/** Longest side of the downscaled copy sent for detection, in pixels. */
export const DETECT_MAX_SIDE = 1024;
/** Largest processed JPEG the upload accepts, in bytes. */
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;

export type Point = { x: number; y: number };
export type Corner = "nw" | "ne" | "sw" | "se";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Clamp a box into the image and enforce the minimum size. */
export function clampBox(box: Box): Box {
  const w = Math.min(1, Math.max(MIN_BOX, box.w));
  const h = Math.min(1, Math.max(MIN_BOX, box.h));
  return { x: clamp01(Math.min(box.x, 1 - w)), y: clamp01(Math.min(box.y, 1 - h)), w, h };
}

/** A box from a drag between two points, or null when the drag is too small. */
export function boxFromDrag(start: Point, end: Point): Box | null {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(start.x - end.x);
  const h = Math.abs(start.y - end.y);
  if (w < MIN_BOX || h < MIN_BOX) return null;
  return clampBox({ x, y, w, h });
}

/** Move a box by a delta, keeping it inside the image. */
export function moveBox(box: Box, dx: number, dy: number): Box {
  return clampBox({ ...box, x: box.x + dx, y: box.y + dy });
}

/** Resize a box from one corner; the opposite corner stays put. */
export function resizeBox(box: Box, corner: Corner, dx: number, dy: number): Box {
  const right = box.x + box.w;
  const bottom = box.y + box.h;
  let { x, y } = box;
  let w = box.w;
  let h = box.h;
  if (corner === "nw" || corner === "sw") {
    x = box.x + dx;
    w = right - x;
  } else {
    w = box.w + dx;
  }
  if (corner === "nw" || corner === "ne") {
    y = box.y + dy;
    h = bottom - y;
  } else {
    h = box.h + dy;
  }
  if (w < MIN_BOX) {
    if (corner === "nw" || corner === "sw") x = right - MIN_BOX;
    w = MIN_BOX;
  }
  if (h < MIN_BOX) {
    if (corner === "nw" || corner === "ne") y = bottom - MIN_BOX;
    h = MIN_BOX;
  }
  return clampBox({ x, y, w, h });
}

/** A box in fractions, as pixels on an image of the given size. */
export function boxToPixels(
  box: Box,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } {
  return {
    x: Math.round(box.x * width),
    y: Math.round(box.y * height),
    w: Math.round(box.w * width),
    h: Math.round(box.h * height),
  };
}

/** Dimensions scaled so the longest side is at most `max`; smaller images keep their size. */
export function fitWithin(width: number, height: number, max: number): { w: number; h: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { w: width, h: height };
  const scale = max / longest;
  return { w: Math.round(width * scale), h: Math.round(height * scale) };
}

/** True when the bytes start with the JPEG marker. */
export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/**
 * Width and height from a JPEG's start-of-frame marker, or null when the
 * bytes are not a readable JPEG. Never throws on malformed input.
 */
export function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (!isJpeg(bytes)) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1]!;
    const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    if (length < 2) return null;
    // Start-of-frame markers carry the dimensions; skip everything else.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return {
        height: (bytes[offset + 5]! << 8) | bytes[offset + 6]!,
        width: (bytes[offset + 7]! << 8) | bytes[offset + 8]!,
      };
    }
    offset += 2 + length;
  }
  return null;
}

/** Decode a base64 data URL into bytes, or null when malformed. */
export function dataUrlToBytes(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const match = /^data:([a-z0-9/+.-]+);base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) return null;
  try {
    const binary = atob(match[2]!.replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { mime: match[1]!.toLowerCase(), bytes };
  } catch {
    return null;
  }
}
