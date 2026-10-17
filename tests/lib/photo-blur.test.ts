import { describe, expect, it, vi } from "vitest";
import {
  boxFromColumn,
  normalizeSubmittedBox,
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
import { decodePhoto } from "@/lib/photo-canvas";

describe("box maths", () => {
  it("rejects narrow and short drags but accepts exactly the minimum", () => {
    expect(boxFromDrag({ x: 0, y: 0 }, { x: 0.01, y: 0.2 })).toBeNull();
    expect(boxFromDrag({ x: 0, y: 0 }, { x: 0.2, y: 0.01 })).toBeNull();
    expect(boxFromDrag({ x: 0, y: 0 }, { x: 0.05, y: 0.05 })).toEqual({
      x: 0,
      y: 0,
      w: 0.05,
      h: 0.05,
    });
  });
  it.each(["nw", "ne", "sw", "se"] as const)("enforces minimum dimensions from %s", (corner) => {
    const left = corner === "nw" || corner === "sw";
    const top = corner === "nw" || corner === "ne";
    const result = resizeBox(
      { x: 0.4, y: 0.4, w: 0.2, h: 0.2 },
      corner,
      left ? 1 : -1,
      top ? 1 : -1,
    );
    expect(result.w).toBe(0.05);
    expect(result.h).toBe(0.05);
    expect(result.x).toBeCloseTo(left ? 0.55 : 0.4);
    expect(result.y).toBeCloseTo(top ? 0.55 : 0.4);
  });
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
    expect(resizeBox(box, "se", 0.2, 0.2)).toEqual({ x: 0.4, y: 0.4, w: 0.4, h: 0.4 });
    const tiny = resizeBox(box, "se", -1, -1);
    expect(tiny.w).toBeGreaterThanOrEqual(0.05);
    expect(tiny.h).toBeGreaterThanOrEqual(0.05);
    const pastEdge = resizeBox({ x: 0.9, y: 0.9, w: 0.1, h: 0.1 }, "se", 0.5, 0.5);
    expect(pastEdge.x + pastEdge.w).toBeLessThanOrEqual(1);
    expect(pastEdge.y + pastEdge.h).toBeLessThanOrEqual(1);
  });

  it("resizing from the northwest moves the origin", () => {
    const grown = resizeBox({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 }, "nw", -0.1, -0.1);
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
    expect(fitWithin(3200, 1600, 1600)).toEqual({ w: 1600, h: 800 });
    expect(fitWithin(800, 1200, 1600)).toEqual({ w: 800, h: 1200 });
  });
});

describe("JPEG helpers", () => {
  it("contains malformed markers, lengths and truncated non-frame segments", () => {
    expect(jpegDimensions(new Uint8Array([255, 216, 255, 224, 0, 2, 0, 0, 0, 0, 0, 0]))).toBeNull();
    expect(jpegDimensions(new Uint8Array([255, 216, 255, 224, 0, 1, 0, 0, 0, 0, 0, 0]))).toBeNull();
    expect(
      jpegDimensions(new Uint8Array([255, 216, 255, 224, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
    ).toBeNull();
    for (const marker of [0xc4, 0xc8, 0xcc, 0xd0]) {
      expect(
        jpegDimensions(new Uint8Array([255, 216, 255, marker, 0, 2, 0, 0, 0, 0, 0, 0])),
      ).toBeNull();
    }
    expect(dataUrlToBytes("data:image/jpeg;base64,A")).toBeNull();
    expect(dataUrlToBytes("data:IMAGE/JPEG;base64,Y W J j\n")?.bytes).toEqual(
      new Uint8Array([97, 98, 99]),
    );
  });
  function jpeg(width: number, height: number): Uint8Array {
    // Minimal header: SOI, an APP0 segment, then an SOF0 carrying the size.
    return new Uint8Array([
      0xff,
      0xd8,
      0xff,
      0xe0,
      0x00,
      0x0a,
      0x4a,
      0x46,
      0x49,
      0x46,
      0x00,
      0x01,
      0x01,
      0x02,
      0xff,
      0xc0,
      0x00,
      0x11,
      0x08,
      height >> 8,
      height & 0xff,
      width >> 8,
      width & 0xff,
      0x03,
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
    const parsed = dataUrlToBytes(`data:image/jpeg;base64,${btoa("abc")}`);
    expect(parsed?.mime).toBe("image/jpeg");
    expect(Array.from(parsed!.bytes)).toEqual([97, 98, 99]);
    expect(dataUrlToBytes("not a data url")).toBeNull();
  });
});

describe("decodePhoto with a rotated image", () => {
  it("decodes once with EXIF rotation applied, so box maths use the rotated size", async () => {
    // A 4032x3024 photo whose EXIF orientation turns it portrait: the decoded
    // bitmap is 3024x4032, and every box is a fraction of that.
    const bitmap = { width: 3024, height: 4032 } as ImageBitmap;
    const spy = vi.fn(async () => bitmap);
    vi.stubGlobal("createImageBitmap", spy);
    const file = new Blob(["jpeg"], { type: "image/jpeg" });

    await expect(decodePhoto(file)).resolves.toBe(bitmap);
    expect(spy).toHaveBeenCalledWith(file, { imageOrientation: "from-image" });

    const box = { x: 0.4, y: 0.5, w: 0.2, h: 0.1 };
    expect(boxToPixels(box, bitmap.width, bitmap.height)).toEqual({
      x: 1210,
      y: 2016,
      w: 605,
      h: 403,
    });
    vi.unstubAllGlobals();
  });
});

describe("normalizeSubmittedBox", () => {
  it("rounds to four places and keeps a box touching the right and bottom edges", () => {
    expect(normalizeSubmittedBox({ x: 0.700004, y: 0.83333, w: 0.300004, h: 0.166674 })).toEqual({
      x: 0.7,
      y: 0.8333,
      w: 0.3,
      h: 0.1667,
    });
  });
  it("clamps negative origins and overflowing sizes into the photo", () => {
    expect(normalizeSubmittedBox({ x: -0.01, y: -0.2, w: 1.5, h: 0.5 })).toEqual({
      x: 0,
      y: 0,
      w: 1,
      h: 0.5,
    });
  });
  it.each([
    null,
    "box",
    { x: 0.1, y: 0.1, w: 0.1 },
    { x: 0.1, y: 0.1, w: Number.NaN, h: 0.1 },
    { x: 0.1, y: 0.1, w: "0.1", h: 0.1 },
    { x: 0.1, y: 0.1, w: 0, h: 0.1 },
    { x: 0.1, y: 0.1, w: 0.1, h: -0.1 },
    { x: 1, y: 0, w: 0.1, h: 0.1 },
  ])("refuses %o", (input) => {
    expect(normalizeSubmittedBox(input)).toBeNull();
  });
});

describe("boxFromColumn", () => {
  it("reads a stored box and refuses missing or malformed columns", () => {
    expect(boxFromColumn([0.1, 0.2, 0.3, 0.4])).toEqual({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 });
    expect(boxFromColumn(null)).toBeNull();
    expect(boxFromColumn(undefined)).toBeNull();
    expect(boxFromColumn([0.1, 0.2])).toBeNull();
  });
});
