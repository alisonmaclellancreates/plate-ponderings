import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ stream: vi.fn(), fetch: vi.fn(), provider: vi.fn(), runId: vi.fn() }));
vi.mock("ai", () => ({ streamText: mocks.stream, Output: { object: vi.fn() } }));
vi.mock("@ai-sdk/openai", () => ({ createOpenAI: mocks.provider }));
vi.mock("@/lib/ai/run-id.server.ts", () => ({ createLovableAiGatewayRunIdFetch: () => ({ fetch: mocks.fetch, getRunId: mocks.runId }) }));
import { moderateHandle } from "@/lib/handle-moderation.server";
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("LOVABLE_API_KEY", "test"); mocks.provider.mockReturnValue({ responses: vi.fn() }); mocks.stream.mockReturnValue({ output: Promise.resolve({ approved: true }) }); mocks.runId.mockReturnValue("safe-id"); });
it("does not call AI without configuration", async () => { vi.stubEnv("LOVABLE_API_KEY", ""); expect(await moderateHandle("test")).toEqual({ outcome: "unavailable", block: null }); expect(mocks.stream).not.toHaveBeenCalled(); });
it.each([true, false])("returns structured approval %s from one streamed call", async approved => { mocks.stream.mockReturnValue({ output: Promise.resolve({ approved }) }); expect(await moderateHandle("test")).toEqual({ outcome: approved ? "approved" : "rejected", block: null, runId: "safe-id" }); expect(mocks.stream).toHaveBeenCalledWith(expect.objectContaining({ maxRetries: 0 })); });
it.each([[402, "", "credit_block"], [403, "permission_error", "provider_access_denied"], [403, "credit_limit_reached", "credit_block"], [429, "", null], [503, "", null], [403, "provider_not_available_in_region", null]])("categorizes status %s safely", async (status, type, block) => {
  mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ error: { type } }), { status: Number(status) }));
  mocks.stream.mockImplementation(() => ({ output: (async () => { const config = mocks.provider.mock.calls[0]?.[0]; await config.fetch("https://ai.gateway.lovable.dev/v1/responses"); throw new Error("terminal"); })() }));
  expect(await moderateHandle("test")).toEqual({ outcome: "unavailable", block, runId: "safe-id" });
});
it("handles malformed denial bodies and network failures without inventing a block", async () => {
  mocks.fetch.mockResolvedValue(new Response("bad", { status: 403 }));
  mocks.stream.mockImplementation(() => ({ output: (async () => { await mocks.provider.mock.calls[0]?.[0].fetch("test"); throw new Error(); })() }));
  expect((await moderateHandle("test")).block).toBeNull();
  mocks.stream.mockImplementation(() => { throw new Error("timeout"); });
  expect((await moderateHandle("test")).block).toBeNull();
});