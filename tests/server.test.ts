import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ERROR_PAGE = "<html>server-error-page-marker</html>";
const SWALLOWED = JSON.stringify({ unhandled: true, message: "HTTPError" });

type InnerFetch = (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
type ServerModule = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response>;
};

let consumeLastCapturedError: ReturnType<typeof vi.fn>;
let entryFactoryRuns = 0;

async function loadServer(
  innerFetch: InnerFetch,
  options: { captured?: unknown; noDefault?: boolean } = {},
) {
  vi.resetModules();
  entryFactoryRuns = 0;
  consumeLastCapturedError = vi.fn(() => options.captured);
  vi.doMock("@/lib/error-capture", () => ({ consumeLastCapturedError }));
  vi.doMock("@/lib/error-page", () => ({ renderErrorPage: () => ERROR_PAGE }));
  vi.doMock("@tanstack/react-start/server-entry", () => {
    entryFactoryRuns += 1;
    return options.noDefault
      ? { default: undefined, fetch: innerFetch }
      : { default: { fetch: innerFetch } };
  });
  const mod = await import("@/server");
  return mod.default as ServerModule;
}

const request = () => new Request("https://example.test/");

async function expectErrorPage(res: Response) {
  expect(res.status).toBe(500);
  expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
  expect(await res.text()).toBe(ERROR_PAGE);
}

describe("server.ts fetch", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.doUnmock("@/lib/error-capture");
    vi.doUnmock("@/lib/error-page");
    vi.doUnmock("@tanstack/react-start/server-entry");
    vi.resetModules();
  });

  it("gives background work the Worker's waitUntil from ctx, or from the request when ctx is absent", async () => {
    const { runAfterResponse } = await import("@/lib/after-response.server");
    const ok = new Response("ok");
    const server = await loadServer(async () => {
      const { runAfterResponse: inner } = await import("@/lib/after-response.server");
      inner(Promise.resolve());
      return ok;
    });
    void runAfterResponse;
    const ctx = { waitUntil: vi.fn() };
    await server.fetch(request(), {}, ctx);
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
    const req = Object.assign(request(), { waitUntil: vi.fn() });
    await server.fetch(req, {}, undefined);
    expect(req.waitUntil).toHaveBeenCalledTimes(1);
  });

  it("returns the inner 200 Response object as is and forwards request, env and ctx", async () => {
    const ok = new Response("hi", { status: 200 });
    const inner = vi.fn(() => ok);
    const server = await loadServer(inner);
    const req = request();
    const env = { e: 1 };
    const ctx = { c: 2 };
    expect(await server.fetch(req, env, ctx)).toBe(ok);
    expect(inner).toHaveBeenCalledWith(req, env, ctx);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("passes through a 500 with a non-JSON content type", async () => {
    const res = new Response("oops", { status: 500, headers: { "content-type": "text/html" } });
    const server = await loadServer(() => res);
    expect(await server.fetch(request(), {}, {})).toBe(res);
  });

  it("passes through a 500 with no content type at all", async () => {
    const res = new Response(null, { status: 500 });
    expect(res.headers.get("content-type")).toBeNull();
    const server = await loadServer(() => res);
    expect(await server.fetch(request(), {}, {})).toBe(res);
  });

  it("passes through a 500 JSON body that is not the swallowed-error shape", async () => {
    const res = new Response(JSON.stringify({ unhandled: true, message: "Other" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
    const server = await loadServer(() => res);
    expect(await server.fetch(request(), {}, {})).toBe(res);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("passes through a 500 JSON content type whose body is not valid JSON", async () => {
    const res = new Response("{not json", {
      status: 500,
      headers: { "content-type": "application/json" },
    });
    const server = await loadServer(() => res);
    expect(await server.fetch(request(), {}, {})).toBe(res);
  });

  it("replaces a swallowed h3 error with the HTML page and logs the captured error", async () => {
    const captured = new Error("real cause");
    const res = new Response(SWALLOWED, {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
    const server = await loadServer(() => res, { captured });
    const out = await server.fetch(request(), {}, {});
    expect(out).not.toBe(res);
    await expectErrorPage(out);
    expect(consumeLastCapturedError).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(captured);
  });

  it("logs a synthetic error naming the body when nothing was captured", async () => {
    const res = new Response(SWALLOWED, {
      status: 503,
      headers: { "content-type": "application/json" },
    });
    const server = await loadServer(() => res);
    await expectErrorPage(await server.fetch(request(), {}, {}));
    const logged = errorSpy.mock.calls[0]?.[0] as Error;
    expect(logged).toBeInstanceOf(Error);
    expect(logged.message).toBe(`h3 swallowed SSR error: ${SWALLOWED}`);
  });

  it("logs and returns the error page when the inner handler throws", async () => {
    const boom = new Error("handler blew up");
    const server = await loadServer(() => Promise.reject(boom));
    await expectErrorPage(await server.fetch(request(), {}, {}));
    expect(errorSpy).toHaveBeenCalledWith(boom);
  });

  it("loads the server entry once and reuses it", async () => {
    const inner = vi.fn(() => new Response("ok"));
    const server = await loadServer(inner);
    await server.fetch(request(), {}, {});
    await server.fetch(request(), {}, {});
    expect(entryFactoryRuns).toBe(1);
    expect(inner).toHaveBeenCalledTimes(2);
  });

  it("falls back to the module itself when it has no default export", async () => {
    const ok = new Response("module-level");
    const server = await loadServer(() => ok, { noDefault: true });
    expect(await server.fetch(request(), {}, {})).toBe(ok);
  });
});
