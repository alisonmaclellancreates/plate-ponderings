import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  streamText: vi.fn(),
  responses: vi.fn(() => "model"),
}));

vi.mock("ai", () => ({
  streamText: m.streamText,
  Output: { object: (opts: unknown) => opts },
}));
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => ({ responses: m.responses }),
}));
vi.mock("@/lib/ai/run-id.server", () => ({
  createLovableAiGatewayRunIdFetch: () => ({
    fetch: (input: unknown, init: unknown) => fetch(input as RequestInfo, init as RequestInit),
    getRunId: () => "run-1",
  }),
}));

import { detectPlateBoxInImage } from "@/lib/photo-detect.server";

const DATA_URL = "data:image/jpeg;base64,AAAA";

function aiReturns(output: unknown) {
  m.streamText.mockReturnValue({ output: Promise.resolve(output) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("LOVABLE_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("detectPlateBoxInImage", () => {
  it("returns unavailable without a gateway key, never calling the AI", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "");
    await expect(detectPlateBoxInImage(DATA_URL)).resolves.toEqual({
      outcome: "unavailable",
      block: null,
    });
    expect(m.streamText).not.toHaveBeenCalled();
  });

  it("returns unavailable when the test switch forces it", async () => {
    vi.stubEnv("PHOTO_DETECT_FORCE_UNAVAILABLE", "1");
    await expect(detectPlateBoxInImage(DATA_URL)).resolves.toEqual({
      outcome: "unavailable",
      block: null,
    });
    expect(m.streamText).not.toHaveBeenCalled();
  });

  it("returns the plate box as clamped fractions", async () => {
    aiReturns({ found: true, x: 0.1, y: 0.2, w: 0.3, h: 0.1 });
    await expect(detectPlateBoxInImage(DATA_URL)).resolves.toEqual({
      outcome: "ok",
      box: { x: 0.1, y: 0.2, w: 0.3, h: 0.1 },
    });
  });

  it("returns no box when the model finds none", async () => {
    aiReturns({ found: false, x: null, y: null, w: null, h: null });
    await expect(detectPlateBoxInImage(DATA_URL)).resolves.toEqual({ outcome: "ok", box: null });
  });

  it("sends a strict-safe schema: every key required, box values nullable", async () => {
    aiReturns({ found: true, x: 0.1, y: 0.2, w: 0.3, h: 0.1 });
    await detectPlateBoxInImage(DATA_URL);
    const call = m.streamText.mock.calls[0]?.[0] as { output: { schema: z.ZodType } };
    const schema = call.output.schema;
    expect(schema.safeParse({ found: false }).success).toBe(false);
    expect(
      schema.safeParse({ found: false, x: null, y: null, w: null, h: null }).success,
    ).toBe(true);
  });

  it("returns no box when the box is smaller than the minimum", async () => {
    aiReturns({ found: true, x: 0.1, y: 0.2, w: 0.01, h: 0.01 });
    await expect(detectPlateBoxInImage(DATA_URL)).resolves.toEqual({ outcome: "ok", box: null });
  });

  it("a thrown failure becomes unavailable, never an exception", async () => {
    m.streamText.mockReturnValue({ output: Promise.reject(new Error("gateway down")) });
    await expect(detectPlateBoxInImage(DATA_URL)).resolves.toEqual({
      outcome: "unavailable",
      block: null,
      runId: "run-1",
    });
  });
});
