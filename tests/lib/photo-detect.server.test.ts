import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const m = vi.hoisted(() => ({
  streamText: vi.fn(),
  responses: vi.fn(() => "model"),
  provider: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: m.streamText,
  Output: { object: (opts: unknown) => opts },
}));
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: (options: unknown) => {
    m.provider(options);
    return { responses: m.responses };
  },
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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("detectPlateBoxInImage", () => {
  it.each([
    { found: true, x: null, y: 0.2, w: 0.3, h: 0.1 },
    { found: true, x: 0.1, y: null, w: 0.3, h: 0.1 },
    { found: true, x: 0.1, y: 0.2, w: null, h: 0.1 },
    { found: true, x: 0.1, y: 0.2, w: 0.3, h: null },
    { found: true, x: 0.1, y: 0.2, w: 0.3, h: 0.01 },
  ])("returns no box for incomplete or undersized coordinates %o", async (output) => {
    aiReturns(output);
    await expect(detectPlateBoxInImage(DATA_URL)).resolves.toEqual({ outcome: "ok", box: null });
  });

  it.each([
    [402, { type: "insufficient_credits" }, "credit_block"],
    [403, { error: { type: "provider_access_denied" } }, "provider_denied"],
    [403, { error: { code: "provider_access_denied" } }, "provider_denied"],
    [403, {}, "provider_denied"],
    [403, "not JSON", "provider_denied"],
    [429, {}, null],
    [500, {}, null],
  ])("contains gateway status %s with body %o", async (status, body, block) => {
    const response = new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status: Number(status),
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    m.streamText.mockImplementation(() => ({
      output: (async () => {
        const options = m.provider.mock.calls[0]?.[0] as {
          fetch: typeof fetch;
        };
        expect(await options.fetch("https://example.test", {})).toBe(response);
        throw new Error("gateway failed");
      })(),
    }));
    await expect(detectPlateBoxInImage(DATA_URL)).resolves.toEqual({
      outcome: "unavailable",
      block,
      runId: "run-1",
    });
    expect(warn).toHaveBeenCalledTimes(Number(status) === 402 || Number(status) === 403 ? 1 : 0);
  });

  it.each([{ found: true }, { found: true, x: -0.1, y: 0, w: 0.2, h: 0.2 }])(
    "contains schema-invalid model output %o",
    async (output) => {
      m.streamText.mockImplementation((options: { output: { schema: z.ZodType } }) => ({
        output: Promise.resolve().then(() => options.output.schema.parse(output)),
      }));
      await expect(detectPlateBoxInImage(DATA_URL)).resolves.toEqual({
        outcome: "unavailable",
        block: null,
        runId: "run-1",
      });
    },
  );
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
    expect(schema.safeParse({ found: false, x: null, y: null, w: null, h: null }).success).toBe(
      true,
    );
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
