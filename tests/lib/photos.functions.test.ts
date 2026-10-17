import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  detect: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (data: unknown) => data;
    const builder = {
      middleware: () => builder,
      inputValidator: (fn: (data: unknown) => unknown) => {
        validate = fn;
        return builder;
      },
      handler:
        (fn: (args: { data: unknown; context: unknown }) => unknown) =>
        (args: { data: unknown; context: unknown }) =>
          fn({ ...args, data: validate(args.data) }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { storage: { from: () => ({ upload: mocks.upload }) } },
}));
vi.mock("@/lib/photo-detect.server", () => ({ detectPlateBoxIn: mocks.detect }));

import { detectPlateBox, uploadStoryPhoto } from "@/lib/photos.functions";

const context = { userId: "caller-uuid" };

async function call(fn: unknown, data: unknown) {
  return await (fn as (a: unknown) => Promise<Record<string, unknown>>)({ data, context });
}

/** A small valid JPEG data URL (SOF0 says 800x600). */
function jpegDataUrl(width = 800, height = 600): string {
  const bytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xc0, 0x00,
    0x11, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 0x03,
  ]);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:image/jpeg;base64,${btoa(bin)}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.upload.mockResolvedValue({ error: null });
  mocks.detect.mockResolvedValue({ outcome: "unavailable" });
});

describe("detectPlateBox", () => {
  it("passes the caller and photo to detection and returns its outcome", async () => {
    const box = { x: 0.1, y: 0.2, w: 0.3, h: 0.1 };
    mocks.detect.mockResolvedValue({ outcome: "ok", box });
    await expect(call(detectPlateBox, { dataUrl: "data:image/jpeg;base64,AAAA" })).resolves.toEqual(
      { outcome: "ok", box },
    );
    expect(mocks.detect).toHaveBeenCalledWith("caller-uuid", "data:image/jpeg;base64,AAAA");
  });

  it("returns unavailable when detection is unavailable", async () => {
    await expect(call(detectPlateBox, { dataUrl: "x" })).resolves.toEqual({
      outcome: "unavailable",
    });
  });
});

describe("uploadStoryPhoto", () => {
  it("stores the photo in the caller's own folder", async () => {
    await expect(call(uploadStoryPhoto, { dataUrl: jpegDataUrl() })).resolves.toEqual({
      path: expect.stringMatching(/^caller-uuid\/.+\.jpg$/),
    });
    const [path, bytes, opts] = mocks.upload.mock.calls[0];
    expect(path).toMatch(/^caller-uuid\//);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(opts).toEqual({ contentType: "image/jpeg", upsert: false });
  });

  it("rejects a photo that is not a JPEG", async () => {
    await expect(
      call(uploadStoryPhoto, { dataUrl: "data:image/png;base64,AAAA" }),
    ).resolves.toEqual({ error: "invalid" });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects a photo over the size cap", async () => {
    const big = `data:image/jpeg;base64,${"A".repeat(5_600_000)}`;
    await expect(call(uploadStoryPhoto, { dataUrl: big })).resolves.toEqual({ error: "invalid" });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects a photo over 1600px on its longest side", async () => {
    await expect(call(uploadStoryPhoto, { dataUrl: jpegDataUrl(1601, 800) })).resolves.toEqual({
      error: "invalid",
    });
    await expect(call(uploadStoryPhoto, { dataUrl: jpegDataUrl(800, 1601) })).resolves.toEqual({
      error: "invalid",
    });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("returns error when storage fails", async () => {
    mocks.upload.mockResolvedValue({ error: new Error("denied") });
    await expect(call(uploadStoryPhoto, { dataUrl: jpegDataUrl() })).resolves.toEqual({
      error: "error",
    });
  });
});
