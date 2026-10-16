import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ERROR_PAGE = "<html>error-page-marker</html>";
const csrfMarker = { kind: "csrf-marker" };
const attachMarker = { kind: "attach-supabase-auth-marker" };

type Next = () => Promise<unknown>;
type ServerMiddleware = (args: { next: Next }) => Promise<unknown>;
type CsrfConfig = { filter: (ctx: { handlerType: string }) => boolean };
type StartConfig = { functionMiddleware: unknown[]; requestMiddleware: unknown[] };

let createCsrfMiddleware: ReturnType<typeof vi.fn>;

async function loadStart() {
  vi.resetModules();
  createCsrfMiddleware = vi.fn((_config: CsrfConfig) => csrfMarker);
  vi.doMock("@tanstack/react-start", () => ({
    createStart: (fn: () => unknown) => fn(),
    createMiddleware: () => ({
      server: (handler: unknown) => handler,
      client: (handler: unknown) => handler,
    }),
    createCsrfMiddleware,
  }));
  vi.doMock("@/lib/error-page", () => ({ renderErrorPage: () => ERROR_PAGE }));
  vi.doMock("@/integrations/supabase/auth-attacher", () => ({ attachSupabaseAuth: attachMarker }));
  const mod = await import("@/start");
  const config = mod.startInstance as unknown as StartConfig;
  const errorMiddleware = config.requestMiddleware[0] as ServerMiddleware;
  return { config, errorMiddleware };
}

describe("start.ts", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.doUnmock("@tanstack/react-start");
    vi.doUnmock("@/lib/error-page");
    vi.doUnmock("@/integrations/supabase/auth-attacher");
    vi.resetModules();
  });

  it("registers the auth attacher as function middleware and error then CSRF as request middleware", async () => {
    const { config } = await loadStart();
    expect(config.functionMiddleware).toEqual([attachMarker]);
    expect(config.requestMiddleware).toHaveLength(2);
    expect(typeof config.requestMiddleware[0]).toBe("function");
    expect(config.requestMiddleware[1]).toBe(csrfMarker);
  });

  it("CSRF filter applies only to server function handlers", async () => {
    await loadStart();
    expect(createCsrfMiddleware).toHaveBeenCalledTimes(1);
    const config = createCsrfMiddleware.mock.calls[0]?.[0] as CsrfConfig;
    expect(config.filter({ handlerType: "serverFn" })).toBe(true);
    expect(config.filter({ handlerType: "router" })).toBe(false);
    expect(config.filter({ handlerType: "serverRoute" })).toBe(false);
  });

  it("passes the result of next straight through", async () => {
    const { errorMiddleware } = await loadStart();
    const result = { ok: true };
    await expect(errorMiddleware({ next: () => Promise.resolve(result) })).resolves.toBe(result);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("turns an ordinary error into a 500 HTML error page and logs it", async () => {
    const { errorMiddleware } = await loadStart();
    const boom = new Error("boom");
    const res = (await errorMiddleware({ next: () => Promise.reject(boom) })) as Response;
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await res.text()).toBe(ERROR_PAGE);
    expect(errorSpy).toHaveBeenCalledWith(boom);
  });

  it("rethrows an object carrying a statusCode untouched", async () => {
    const { errorMiddleware } = await loadStart();
    const httpError = { statusCode: 404, message: "not found" };
    await expect(errorMiddleware({ next: () => Promise.reject(httpError) })).rejects.toBe(
      httpError,
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("treats null and primitive throws as ordinary errors", async () => {
    const { errorMiddleware } = await loadStart();
    for (const thrown of [null, "plain string"]) {
      const res = (await errorMiddleware({ next: () => Promise.reject(thrown) })) as Response;
      expect(res.status).toBe(500);
      expect(await res.text()).toBe(ERROR_PAGE);
    }
  });

  it("does not let a thrown Response through: it becomes the 500 page (current behaviour)", async () => {
    const { errorMiddleware } = await loadStart();
    const thrown = new Response("redirect", { status: 302, headers: { location: "/" } });
    const res = (await errorMiddleware({ next: () => Promise.reject(thrown) })) as Response;
    expect(res).not.toBe(thrown);
    expect(res.status).toBe(500);
    expect(await res.text()).toBe(ERROR_PAGE);
  });
});
