import { afterEach, expect, it, vi } from "vitest";
import { createLovableAiGatewayRunIdFetch } from "@/lib/ai/run-id.server";
afterEach(() => vi.unstubAllGlobals());
it("uses only gateway-issued ids and propagates them to later calls", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response("ok", { headers: { "X-Lovable-AIG-Run-ID": "gateway-id" } }));
  vi.stubGlobal("fetch", fetcher);
  const run = createLovableAiGatewayRunIdFetch();
  await run.fetch("https://example.com");
  expect(await run.waitForRunId()).toBe("gateway-id");
  await run.fetch("https://example.com");
  expect(fetcher.mock.calls[1]?.[1].headers.get("X-Lovable-AIG-Run-ID")).toBe("gateway-id");
  expect(run.getRunId()).toBe("gateway-id");
});
it("preserves initial ids and explicit headers", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("ok"));
  vi.stubGlobal("fetch", fetcher);
  const run = createLovableAiGatewayRunIdFetch(" existing ");
  expect(await run.waitForRunId()).toBe("existing");
  await run.fetch("https://example.com", { headers: { "X-Lovable-AIG-Run-ID": "explicit" } });
  expect(fetcher.mock.calls[0]?.[1].headers.get("X-Lovable-AIG-Run-ID")).toBe("explicit");
});
it("resolves missing ids on empty responses and network failures", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ok")));
  const run = createLovableAiGatewayRunIdFetch("");
  await run.fetch("https://example.com");
  expect(await run.waitForRunId()).toBeUndefined();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
  const failed = createLovableAiGatewayRunIdFetch();
  await expect(failed.fetch("test")).rejects.toThrow();
  expect(await failed.waitForRunId()).toBeUndefined();
});
