import { describe, expect, it } from "vitest";
import {
  boxFromDrag,
  boxToPixels,
  clampBox,
  dataUrlToBytes,
  fitWithin,
  isJpeg,
  jpegDimensions,
  moveBox,
  resizeBox,
} from "@/lib/photo-blur";
import { normalizeDetectionBox } from "@/lib/photo-canvas";

describe("box maths", () => {
  it("clamps a box into the image", () => {
    expect(clampBox({ x: -0.5, y: 1.2, w: 2, h: 0.1 })).toEqual({ x: 0, y: 0.9, w: 1, h: 0.1 });
  });

  it("dragging in either direction produces the same box", () => {
    const a = boxFromDrag({ x: 0.2, y: 0.3 }, { x: 0.5, y: 0.6 });
    const b = boxFromDrag({ x: 0.5, y: 0.6 }, { x: 0.2, y: 0.3 });
    expect(a).toEqual(b);
    expect(a).toEqual({ x: 0.2, y: 0.3, w: 0.3, h: 0.3 });
  });

  it("moving keeps the box inside the image", () => {
    const box = { x: 0.9, y: 0.9, w: 0.2, h: 0.2 };
    expect(moveBox(box, 0.5, 0.5)).toEqual({ x: 0.8, y: 0.8, w: 0.2, h: 0.2 });
    expect(moveBox(box, -2, -2)).toEqual({ x: 0, y: 0, w: 0.2, h: 0.2 });
  });

  it("resizing from a corner respects the minimum size and the edges", () => {
    const box = { x: 0.4, y: 0.4, w: 0.2, h: 0.2 };
    const bigger = resizeBox(box, "se", 0.2, 0.2);
    expect(bigger).toEqual({ x: 0.4, y: 0.4, w: 0.4, h: 0.4 });
    const tiny = resizeBox(box, "se", -1, -1);
    expect(tiny.w).toBeGreaterThanOrEqual(0.05);
    expect(tiny.h).toBeGreaterThanOrEqual(0.05);
    const pastEdge = resizeBox({ x: 0.9, y: 0.9, w: 0.1, h: 0.1 }, "se", 0.5, 0.5);
    expect(pastEdge.x + pastEdge.w).toBeLessThanOrEqual(1);
    expect(pastEdge.y + pastEdge.h).toBeLessThanOrEqual(1);
  });

  it("resizing from the northwest moves the origin", () => {
    const box = { x: 0.4, y: 0.4, w: 0.2, h: 0.2 };
    const grown = resizeBox(box, "nw", -0.1, -0.1);
    expect(grown.x).toBeCloseTo(0.3);
    expect(grown.y).toBeCloseTo(0.3);
    expect(grown.w).toBeCloseTo(0.3);
    expect(grown.h).toBeCloseTo(0.3);
  });

  it("converts to pixels on the decoded image", () => {
    expect(boxToPixels({ x: 0.25, y: 0.5, w: 0.5, h: 0.25 }, 800, 400)).toEqual({
      x: 200,
      y: 200,
      w: 400,
      h: 100,
    });
  });
});

describe("fitWithin", () => {
  it("caps the longest side and keeps the aspect ratio", () => {
    expect(fitWithin(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 });
    expect(fitWithin(800, 1200, 1600)).toEqual({ width: 800, height: 1200 });
  });
});

describe("JPEG helpers", () => {
  function jpeg(width: number, height: number): Uint8Array {
    // Minimal JFIF-style header with an SOF0 segment carrying the size.
    return new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xc0, 0x00,
      0x11, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 0x03,
    ]);
  }

  it("recognizes the JPEG magic bytes", () => {
    expect(isJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });

  it("reads dimensions from the SOF segment", () => {
    expect(jpegDimensions(jpeg(1600, 900))).toEqual({ width: 1600, height: 900 });
    expect(jpegDimensions(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });

  it("decodes a data URL and rejects anything else", () => {
    const url = `data:image/jpeg;base64,${btoa("abc")}`;
    expect(Array.from(dataUrlToBytes(url)!)).toEqual([97, 98, 99]);
    expect(dataUrlToBytes("data:image/png;base64,AAAA")).toBeNull();
    expect(dataUrlToBytes("not a data url")).toBeNull();
  });
});

describe("normalizeDetectionBox with a rotated image", () => {
  // A 4032x3024 photo whose EXIF orientation turns it portrait: the decoded
  // bitmap is 3024x4032. The detection copy and the canvas both come from
  // that decoded bitmap, so a portrait box must land on the right pixels.
  it("maps a portrait box onto the rotated decoded image", () => {
    const box = normalizeDetectionBox({ x: 0.4, y: 0.5, w: 0.2, h: 0.1 }, 3024, 4032);
    expect(box.x).toBeCloseTo(0.4);
    expect(box.w).toBeCloseTo(0.2);
    expect(boxToPixels(box, 3024, 4032)).toEqual({ x: 1210, y: 2016, w: 605, h: 403 });
  });

  it("keeps a landscape box landscape", () => {
    const box = normalizeDetectionBox({ x: 0.25, y: 0.5, w: 0.5, h: 0.2 }, 4032, 3024);
    expect(box.w).toBeCloseTo(0.5);
    expect(box.h).toBeCloseTo(0.2);
  });

  it("never returns a box taller than wide", () => {
    const box = normalizeDetectionBox({ x: 0, y: 0, w: 0.1, h: 0.9 }, 3024, 4032);
    expect(box.w).toBeGreaterThanOrEqual(box.h);
  });
});
