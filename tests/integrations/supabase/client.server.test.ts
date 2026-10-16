import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const createClient = vi.fn();

beforeEach(() => {
  vi.resetModules();
  createClient.mockReset();
  createClient.mockImplementation(() => ({ from: vi.fn(), tag: "admin" }));
  vi.doMock("@supabase/supabase-js", () => ({ createClient }));
  vi.stubEnv("SUPABASE_URL", "https://proj.example.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_service");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.doUnmock("@supabase/supabase-js");
});

// Return the module, not the proxy: awaiting the proxy reads `.then` and builds the client.
async function load() {
  const mod = await import("@/integrations/supabase/client.server");
  return mod;
}

function silenceMissing() {
  const original = console.error;
  return vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("[Supabase] Missing")) return;
    original(...args);
  });
}

describe("supabaseAdmin", () => {
  it("builds lazily on first access and reuses the client", async () => {
    const admin = (await load()).supabaseAdmin;
    expect(createClient).not.toHaveBeenCalled();
    expect((admin as unknown as { tag: string }).tag).toBe("admin");
    expect(createClient).toHaveBeenCalledTimes(1);
    void admin.from;
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it("passes URL, service role key and non-persistent auth", async () => {
    void (await load()).supabaseAdmin.from;
    const [url, key, opts] = createClient.mock.calls[0] ?? [];
    expect(url).toBe("https://proj.example.co");
    expect(key).toBe("sb_secret_service");
    expect(opts.auth).toEqual({
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    });
    expect(typeof opts.global.fetch).toBe("function");
  });

  it.each([
    [["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"], "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY."],
    [["SUPABASE_URL"], "SUPABASE_URL."],
    [["SUPABASE_SERVICE_ROLE_KEY"], "SUPABASE_SERVICE_ROLE_KEY."],
  ])("throws naming missing %j", async (missing, text) => {
    for (const m of missing) vi.stubEnv(m, "");
    const spy = silenceMissing();
    const admin = (await load()).supabaseAdmin;
    expect(() => admin.from).toThrow(`Missing Supabase environment variable(s): ${text}`);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining(text));
  });
});

describe("client.server fetch wrapper", () => {
  async function wrapperFor(key: string): Promise<FetchFn> {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", key);
    void (await load()).supabaseAdmin.from;
    return createClient.mock.calls[0]?.[2].global.fetch as FetchFn;
  }
  function spyFetch() {
    const spy = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", spy);
    return spy;
  }
  const headersOf = (spy: ReturnType<typeof spyFetch>) =>
    (spy.mock.calls[0] as unknown as [unknown, RequestInit])[1].headers as Headers;

  it("keeps Authorization for a JWT-style key", async () => {
    const wrap = await wrapperFor("eyJ.service.key");
    const spy = spyFetch();
    await wrap("https://x", { headers: { Authorization: "Bearer eyJ.service.key" } });
    expect(headersOf(spy).get("authorization")).toBe("Bearer eyJ.service.key");
    expect(headersOf(spy).get("apikey")).toBe("eyJ.service.key");
  });

  it("strips the bearer form of the opaque key", async () => {
    const wrap = await wrapperFor("sb_secret_service");
    const spy = spyFetch();
    await wrap("https://x", { headers: { Authorization: "Bearer sb_secret_service" } });
    expect(headersOf(spy).has("authorization")).toBe(false);
  });

  it("keeps a different Authorization with an opaque key", async () => {
    const wrap = await wrapperFor("sb_secret_service");
    const spy = spyFetch();
    await wrap("https://x", { headers: { Authorization: "Bearer user.jwt.x" } });
    expect(headersOf(spy).get("authorization")).toBe("Bearer user.jwt.x");
  });

  it("merges Request headers and caller headers", async () => {
    const wrap = await wrapperFor("sb_secret_service");
    const spy = spyFetch();
    const input = new Request("https://x", { headers: { a: "1" } });
    await wrap(input, { headers: { b: "2" } });
    expect((spy.mock.calls[0] as unknown as [unknown])[0]).toBe(input);
    expect(headersOf(spy).get("a")).toBe("1");
    expect(headersOf(spy).get("b")).toBe("2");
  });

  it("accepts a URL string with no init", async () => {
    const wrap = await wrapperFor("sb_secret_service");
    const spy = spyFetch();
    await wrap("https://x");
    expect(headersOf(spy).get("apikey")).toBe("sb_secret_service");
  });
});
