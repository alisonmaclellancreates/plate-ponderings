import { afterEach, expect, it, vi } from "vitest";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  getLovableAiGatewayResponseHeaders,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai/run-id.server";
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
it("extracts ids and exposes only gateway response headers", () => {
  expect(getLovableAiGatewayRunId(new Request("https://example.com"))).toBeUndefined();
  expect(
    getLovableAiGatewayRunId(
      new Request("https://example.com", { headers: { "X-Lovable-AIG-Run-ID": " id " } }),
    ),
  ).toBe("id");
  const empty = getLovableAiGatewayResponseHeaders(undefined);
  expect(empty.has("Access-Control-Expose-Headers")).toBe(false);
  const headers = getLovableAiGatewayResponseHeaders(
    { "X-Lovable-AIG-Run-ID": "id", private: "no" },
    { "Access-Control-Expose-Headers": "content-type, ", "X-Lovable-AIG-Extra": "yes" },
  );
  expect(headers.get("private")).toBeNull();
  expect(headers.get("Access-Control-Expose-Headers")?.toLowerCase()).toContain(
    "x-lovable-aig-run-id",
  );
  expect(headers.get("Access-Control-Expose-Headers")?.toLowerCase()).toContain(
    "x-lovable-aig-extra",
  );
});
it.each(["id", undefined])("wraps empty-body responses with optional id %s", async (id) => {
  const response = await withLovableAiGatewayRunIdHeader(
    new Response(null, { status: 204 }),
    { getRunId: () => id, waitForRunId: async () => id },
    { Extra: "value" },
  );
  expect(response.status).toBe(204);
  expect(response.headers.get("Extra")).toBe("value");
  expect(response.headers.get("X-Lovable-AIG-Run-ID")).toBe(id ?? null);
});
it.each(["id", undefined])(
  "relays body chunks without buffering with optional id %s",
  async (id) => {
    const response = await withLovableAiGatewayRunIdHeader(
      new Response("hello"),
      { getRunId: () => id, waitForRunId: async () => id },
      { Extra: "value" },
    );
    expect(await response.text()).toBe("hello");
    expect(response.headers.get("Extra")).toBe("value");
  },
);
it("closes an already-empty body stream", async () => {
  const response = await withLovableAiGatewayRunIdHeader(
    new Response(
      new ReadableStream({
        start(c) {
          c.close();
        },
      }),
    ),
    { getRunId: () => undefined, waitForRunId: async () => undefined },
  );
  expect(await response.text()).toBe("");
});
it("propagates stream errors", async () => {
  const response = await withLovableAiGatewayRunIdHeader(
    new Response(
      new ReadableStream({
        start(c) {
          c.error(new Error("stream"));
        },
      }),
    ),
    { getRunId: () => undefined, waitForRunId: async () => undefined },
  );
  await expect(response.text()).rejects.toThrow("stream");
});
it("forwards cancellation upstream", async () => {
  const cancel = vi.fn();
  const response = await withLovableAiGatewayRunIdHeader(
    new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array([1]));
        },
        cancel,
      }),
    ),
    { getRunId: () => undefined, waitForRunId: async () => undefined },
  );
  await response.body?.cancel("stop");
  expect(cancel).toHaveBeenCalledWith("stop");
});
it("relays every chunk in a multi-chunk response in order", async () => {
  const encoder = new TextEncoder();
  const chunks = ["first", " second", " third"];
  let index = 0;
  const upstream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[index++];
      if (chunk === undefined) controller.close();
      else controller.enqueue(encoder.encode(chunk));
    },
  });
  const response = await withLovableAiGatewayRunIdHeader(
    new Response(upstream),
    { getRunId: () => "gateway-id", waitForRunId: async () => "gateway-id" },
  );
  expect(await response.text()).toBe("first second third");
  expect(response.headers.get("X-Lovable-AIG-Run-ID")).toBe("gateway-id");
});
