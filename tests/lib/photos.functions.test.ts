import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  detect: vi.fn(),
  readBlock: vi.fn(),
  persistBlock: vi.fn(),
  adminRpc: vi.fn(),
  userRpc: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createMiddleware: () => ({}),
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
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: mocks.adminRpc,
    storage: { from: () => ({ upload: mocks.upload }) },
  },
}));
vi.mock("@/lib/ai-block.server", () => ({
  readAiBlock: mocks.readBlock,
  persistAiBlock: mocks.persistBlock,
}));
vi.mock("@/lib/photo-detect.server", () => ({ detectPlateBoxInImage: mocks.detect }));

import { detectPlateBox, uploadStoryPhoto } from "@/lib/photos.functions";
import { DEMO_MESSAGE, RATE_LIMIT_MESSAGE } from "@/lib/account-rules";

const context = { userId: "caller-uuid", supabase: { rpc: mocks.userRpc } };

async function call(fn: unknown, data: unknown) {
  return await (fn as (a: unknown) => Promise<Record<string, unknown>>)({ data, context });
}

/** A small valid JPEG data URL (SOF0 says 800x600). */
function jpegDataUrl(width = 800, height = 600): string {
  const bytes = new Uint8Array([
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
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:image/jpeg;base64,${btoa(bin)}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userRpc.mockResolvedValue({ data: false, error: null });
  mocks.readBlock.mockResolvedValue({ category: null });
  mocks.adminRpc.mockResolvedValue({ data: true, error: null });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.detect.mockResolvedValue({ outcome: "ok", box: null });
});

describe("detectPlateBox", () => {
  it.each([42, "data:text/plain;base64,YWJj", `data:image/jpeg;base64,${"A".repeat(3_000_000)}`])(
    "refuses unsupported detection input",
    async (image) => {
      expect(await call(detectPlateBox, { image })).toEqual({ outcome: "unavailable" });
      expect(mocks.detect).not.toHaveBeenCalled();
    },
  );
  it("contains role and AI-state read failures", async () => {
    mocks.userRpc.mockResolvedValueOnce({ data: false, error: new Error("offline") });
    expect(await call(detectPlateBox, { image: jpegDataUrl() })).toEqual({
      outcome: "unavailable",
    });
    mocks.readBlock.mockResolvedValueOnce(null);
    expect(await call(detectPlateBox, { image: jpegDataUrl() })).toEqual({
      outcome: "unavailable",
    });
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
  it.each([null, "credit_block"])("persists only terminal detector blocks: %s", async (block) => {
    mocks.detect.mockResolvedValue({ outcome: "unavailable", block, runId: "r1" });
    expect(await call(detectPlateBox, { image: jpegDataUrl() })).toEqual({
      outcome: "unavailable",
    });
    if (block) expect(mocks.persistBlock).toHaveBeenCalledWith(expect.anything(), block, "r1");
    else expect(mocks.persistBlock).not.toHaveBeenCalled();
  });
  it("passes the photo to detection and returns its box", async () => {
    const box = { x: 0.1, y: 0.2, w: 0.3, h: 0.1 };
    mocks.detect.mockResolvedValue({ outcome: "ok", box });
    await expect(call(detectPlateBox, { image: jpegDataUrl() })).resolves.toEqual({
      outcome: "ok",
      box,
    });
    expect(mocks.detect).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/jpeg/));
  });

  it("returns unavailable when AI checks are paused, without spending an attempt", async () => {
    mocks.readBlock.mockResolvedValue({ category: "credit" });
    await expect(call(detectPlateBox, { image: jpegDataUrl() })).resolves.toEqual({
      outcome: "unavailable",
    });
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it("returns unavailable when the attempt counter errors, including a missing function", async () => {
    mocks.adminRpc.mockResolvedValue({
      data: null,
      error: { code: "42883", message: "function consume_photo_detect_attempt does not exist" },
    });
    await expect(call(detectPlateBox, { image: jpegDataUrl() })).resolves.toEqual({
      outcome: "unavailable",
    });
    expect(mocks.detect).not.toHaveBeenCalled();
  });

  it("returns rate-limited when the attempt is refused", async () => {
    mocks.adminRpc.mockResolvedValue({ data: false, error: null });
    await expect(call(detectPlateBox, { image: jpegDataUrl() })).resolves.toEqual({
      outcome: "rate-limited",
      message: RATE_LIMIT_MESSAGE,
    });
    expect(mocks.detect).not.toHaveBeenCalled();
  });

  it("returns unavailable for the demo account and for a non-image payload", async () => {
    mocks.userRpc.mockResolvedValue({ data: true, error: null });
    await expect(call(detectPlateBox, { image: jpegDataUrl() })).resolves.toEqual({
      outcome: "demo",
      message: DEMO_MESSAGE,
    });
    mocks.userRpc.mockResolvedValue({ data: false, error: null });
    await expect(call(detectPlateBox, { image: "not a data url" })).resolves.toEqual({
      outcome: "unavailable",
    });
    expect(mocks.detect).not.toHaveBeenCalled();
  });
});

describe("uploadStoryPhoto", () => {
  it("contains role lookup errors without uploading", async () => {
    mocks.userRpc.mockResolvedValue({ data: false, error: new Error("offline") });
    expect(await call(uploadStoryPhoto, { jpeg: jpegDataUrl() })).toEqual({ outcome: "error" });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it.each([42, "not a data URL", "data:image/jpeg;base64,AAAA", "data:image/jpeg;base64,/9j/4AAA"])(
    "refuses malformed JPEG input %s",
    async (jpeg) => {
      expect(await call(uploadStoryPhoto, { jpeg })).toEqual({ outcome: "invalid" });
      expect(mocks.upload).not.toHaveBeenCalled();
    },
  );
  it("stores the photo in the caller's own folder", async () => {
    const result = await call(uploadStoryPhoto, { jpeg: jpegDataUrl() });
    expect(result).toEqual({
      outcome: "ok",
      path: expect.stringMatching(/^caller-uuid\/.+\.jpg$/),
    });
    const [path, bytes, opts] = mocks.upload.mock.calls[0]!;
    expect(path).toMatch(/^caller-uuid\//);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(opts).toEqual({ contentType: "image/jpeg" });
  });

  it("rejects a photo that is not a JPEG", async () => {
    await expect(call(uploadStoryPhoto, { jpeg: "data:image/png;base64,AAAA" })).resolves.toEqual({
      outcome: "invalid",
    });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects a photo over the size cap", async () => {
    const big = `data:image/jpeg;base64,${"A".repeat(5_600_000)}`;
    await expect(call(uploadStoryPhoto, { jpeg: big })).resolves.toEqual({ outcome: "invalid" });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects a photo over 1600px on its longest side", async () => {
    await expect(call(uploadStoryPhoto, { jpeg: jpegDataUrl(1601, 800) })).resolves.toEqual({
      outcome: "invalid",
    });
    await expect(call(uploadStoryPhoto, { jpeg: jpegDataUrl(800, 1601) })).resolves.toEqual({
      outcome: "invalid",
    });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("returns error for the demo account and when storage fails", async () => {
    mocks.userRpc.mockResolvedValue({ data: true, error: null });
    await expect(call(uploadStoryPhoto, { jpeg: jpegDataUrl() })).resolves.toEqual({
      outcome: "demo",
      message: DEMO_MESSAGE,
    });
    mocks.userRpc.mockResolvedValue({ data: false, error: null });
    mocks.upload.mockResolvedValue({ error: new Error("denied") });
    await expect(call(uploadStoryPhoto, { jpeg: jpegDataUrl() })).resolves.toEqual({
      outcome: "error",
    });
  });
});
