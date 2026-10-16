import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type Handler = (args: { next: (opts: unknown) => unknown }) => Promise<unknown>;

const createClient = vi.fn();
const getClaims = vi.fn();
let request: { headers?: { get: (name: string) => string | null } } | undefined;

beforeEach(() => {
  vi.resetModules();
  createClient.mockReset();
  getClaims.mockReset();
  createClient.mockImplementation(() => ({ auth: { getClaims } }));
  request = undefined;
  vi.doMock("@supabase/supabase-js", () => ({ createClient }));
  vi.doMock("@tanstack/react-start", () => ({
    createMiddleware: () => ({ server: (fn: Handler) => fn, client: (fn: Handler) => fn }),
  }));
  vi.doMock("@tanstack/react-start/server", () => ({ getRequest: () => request }));
  vi.stubEnv("SUPABASE_URL", "https://proj.example.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_abc");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.doUnmock("@supabase/supabase-js");
  vi.doUnmock("@tanstack/react-start");
  vi.doUnmock("@tanstack/react-start/server");
});

async function load(): Promise<Handler> {
  const mod = await import("@/integrations/supabase/auth-middleware");
  return mod.requireSupabaseAuth as unknown as Handler;
}

function withAuth(value: string | null) {
  request = { headers: { get: (n: string) => (n === "authorization" ? value : null) } };
}

function silenceMissing() {
  const original = console.error;
  return vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("[Supabase] Missing")) return;
    original(...args);
  });
}

const JWT = "aaa.bbb.ccc";

describe("requireSupabaseAuth exits", () => {
  it.each([
    [["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"], "SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY"],
    [["SUPABASE_URL"], "SUPABASE_URL."],
    [["SUPABASE_PUBLISHABLE_KEY"], "SUPABASE_PUBLISHABLE_KEY."],
  ])("throws naming missing %j", async (missing, text) => {
    for (const m of missing) vi.stubEnv(m, "");
    const spy = silenceMissing();
    const mw = await load();
    await expect(mw({ next: vi.fn() })).rejects.toThrow(
      `Missing Supabase environment variable(s): ${text}`,
    );
    expect(spy).toHaveBeenCalled();
  });

  it("throws when the request has no headers", async () => {
    await expect((await load())({ next: vi.fn() })).rejects.toThrow(
      "Unauthorized: No request headers available",
    );
  });

  it("throws when there is no authorization header", async () => {
    withAuth(null);
    await expect((await load())({ next: vi.fn() })).rejects.toThrow(
      "No authorization header provided",
    );
  });

  it("throws for a non-bearer header", async () => {
    withAuth("Basic abc");
    await expect((await load())({ next: vi.fn() })).rejects.toThrow(
      "Only Bearer tokens are supported",
    );
  });

  it("throws for an empty bearer token", async () => {
    withAuth("Bearer ");
    await expect((await load())({ next: vi.fn() })).rejects.toThrow("No token provided");
  });

  it("throws for a token that is not JWT-shaped", async () => {
    withAuth("Bearer opaque");
    await expect((await load())({ next: vi.fn() })).rejects.toThrow("Invalid token");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("throws when verification returns an error", async () => {
    withAuth(`Bearer ${JWT}`);
    getClaims.mockResolvedValue({ data: null, error: new Error("bad") });
    await expect((await load())({ next: vi.fn() })).rejects.toThrow("Unauthorized: Invalid token");
  });

  it("throws when verification returns no claims", async () => {
    withAuth(`Bearer ${JWT}`);
    getClaims.mockResolvedValue({ data: { claims: null }, error: null });
    await expect((await load())({ next: vi.fn() })).rejects.toThrow("Unauthorized: Invalid token");
  });

  it("throws when claims have no user id", async () => {
    withAuth(`Bearer ${JWT}`);
    getClaims.mockResolvedValue({ data: { claims: { role: "authenticated" } }, error: null });
    await expect((await load())({ next: vi.fn() })).rejects.toThrow("No user ID found in token");
  });

  it("calls next with the client, user id and claims on success", async () => {
    withAuth(`Bearer ${JWT}`);
    const claims = { sub: "user-1", role: "authenticated" };
    getClaims.mockResolvedValue({ data: { claims }, error: null });
    const next = vi.fn(() => "ok");
    const out = await (await load())({ next });
    expect(getClaims).toHaveBeenCalledWith(JWT);
    const client = createClient.mock.results[0]?.value;
    expect(next).toHaveBeenCalledWith({ context: { supabase: client, userId: "user-1", claims } });
    expect(out).toBe("ok");
    const [url, key, opts] = createClient.mock.calls[0] ?? [];
    expect(url).toBe("https://proj.example.co");
    expect(key).toBe("sb_publishable_abc");
    expect(opts.global.headers).toEqual({ Authorization: `Bearer ${JWT}` });
    expect(opts.auth).toEqual({ storage: undefined, persistSession: false, autoRefreshToken: false });
  });
});

describe("auth-middleware fetch wrapper", () => {
  async function wrapperFor(key: string): Promise<FetchFn> {
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", key);
    withAuth(`Bearer ${JWT}`);
    getClaims.mockResolvedValue({ data: { claims: { sub: "u" } }, error: null });
    await (await load())({ next: vi.fn() });
    return createClient.mock.calls[0]?.[2].global.fetch as FetchFn;
  }

  function spyFetch() {
    const spy = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", spy);
    return spy;
  }

  function sentHeaders(spy: ReturnType<typeof spyFetch>): Headers {
    const call = spy.mock.calls[0] as unknown as [unknown, RequestInit];
    return call[1].headers as Headers;
  }

  it("keeps Authorization and sets apikey for a JWT-style key", async () => {
    const wrap = await wrapperFor("eyJ.legacy.key");
    const spy = spyFetch();
    await wrap("https://x/rest", { headers: { Authorization: "Bearer eyJ.legacy.key" } });
    const h = sentHeaders(spy);
    expect(h.get("apikey")).toBe("eyJ.legacy.key");
    expect(h.get("authorization")).toBe("Bearer eyJ.legacy.key");
  });

  it("strips Authorization when it is the bearer form of the opaque key", async () => {
    const wrap = await wrapperFor("sb_publishable_abc");
    const spy = spyFetch();
    await wrap("https://x/rest", { headers: { Authorization: "Bearer sb_publishable_abc" } });
    const h = sentHeaders(spy);
    expect(h.has("authorization")).toBe(false);
    expect(h.get("apikey")).toBe("sb_publishable_abc");
  });

  it("keeps a user token alongside an opaque key", async () => {
    const wrap = await wrapperFor("sb_secret_xyz");
    const spy = spyFetch();
    await wrap("https://x/rest", { headers: { Authorization: "Bearer user.jwt.token" } });
    expect(sentHeaders(spy).get("authorization")).toBe("Bearer user.jwt.token");
  });

  it("merges Request headers with caller headers and passes the input through", async () => {
    const wrap = await wrapperFor("sb_publishable_abc");
    const spy = spyFetch();
    const input = new Request("https://x/rest", { headers: { "x-from-request": "1" } });
    await wrap(input, { headers: { "x-from-init": "2" } });
    const call = spy.mock.calls[0] as unknown as [unknown, RequestInit];
    expect(call[0]).toBe(input);
    const h = call[1].headers as Headers;
    expect(h.get("x-from-request")).toBe("1");
    expect(h.get("x-from-init")).toBe("2");
  });

  it("works with a URL string and no init", async () => {
    const wrap = await wrapperFor("sb_publishable_abc");
    const spy = spyFetch();
    await wrap("https://x/rest");
    const call = spy.mock.calls[0] as unknown as [unknown, RequestInit];
    expect(call[0]).toBe("https://x/rest");
    expect((call[1].headers as Headers).get("apikey")).toBe("sb_publishable_abc");
  });
});
