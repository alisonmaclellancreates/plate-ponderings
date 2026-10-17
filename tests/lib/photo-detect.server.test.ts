import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  block: { current: null as null | string },
}));

vi.mock("@/lib/ai-block.server", () => ({
  readAiBlock: () => Promise.resolve(m.block.current),
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: m.rpc },
}));

import { detectPlateBoxIn } from "@/lib/photo-detect.server";

describe("detectPlateBoxIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.block.current = null;
    m.rpc.mockResolvedValue({ data: true, error: null });
  });

  it("returns unavailable when AI checks are paused, without spending an attempt", async () => {
    m.block.current = "credit";
    await expect(detectPlateBoxIn("u1", "data:image/jpeg;base64,AAAA")).resolves.toEqual({
      outcome: "unavailable",
    });
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("returns unavailable when the attempt counter errors, including a missing function", async () => {
    m.rpc.mockResolvedValue({
      data: null,
      error: { code: "42883", message: "function consume_photo_detect_attempt does not exist" },
    });
    await expect(detectPlateBoxIn("u1", "data:image/jpeg;base64,AAAA")).resolves.toEqual({
      outcome: "unavailable",
    });
  });

  it("returns unavailable when the attempt is refused", async () => {
    m.rpc.mockResolvedValue({ data: false, error: null });
    await expect(detectPlateBoxIn("u1", "data:image/jpeg;base64,AAAA")).resolves.toEqual({
      outcome: "unavailable",
    });
  });

  it("returns unavailable when the photo is not a JPEG", async () => {
    await expect(detectPlateBoxIn("u1", "data:image/png;base64,AAAA")).resolves.toEqual({
      outcome: "unavailable",
    });
    await expect(detectPlateBoxIn("u1", "not a data url")).resolves.toEqual({
      outcome: "unavailable",
    });
  });
});
