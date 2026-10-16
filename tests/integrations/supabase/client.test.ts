import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const createClient = vi.fn();
const storageMarker = { marker: "preview-storage" };

const PUBLIC = "https://public.example.co";
const KEY = "sb_publishable_key";

beforeEach(() => {
  vi.resetModules();
  createClient.mockReset();
  createClient.mockImplementation(() => ({ from: vi.fn(), tag: "browser" }));
  vi.doMock("@supabase/supabase-js", () => ({ createClient }));
  vi.doMock("@/integrations/supabase/previewAuthStorage", () => ({
    brokeredPreviewStorage: () => storageMarker,
  }));
  setEnv({ VITE_SUPABASE_URL: PUBLIC, VITE_SUPABASE_PUBLISHABLE_KEY: KEY });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.doUnmock("@supabase/supabase-js");
  vi.doUnmock("@/integrations/supabase/previewAuthStorage");
});

function setEnv(vals: Partial<Record<string, string>>) {
  for (const name of [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
  ]) {
    vi.stubEnv(name, vals[name] ?? "");
  }
}

// Return the module, not the proxy: awaiting the proxy reads `.then` and builds the client.
async function load() {
  const mod = await import("@/integrations/supabase/client");
  return mod;
}

async function wrapper(): Promise<FetchFn> {
  void (await load()).supabase.from;
  return createClient.mock.calls[0]?.[2].global.fetch as FetchFn;
}

function spyFetch() {
  const spy = vi.fn(async () => new Response("ok"));
  vi.stubGlobal("fetch", spy);
  return spy;
}
const callOf = (spy: ReturnType<typeof spyFetch>) =>
  spy.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];

function silenceMissing() {
  const original = console.error;
  return vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("[Supabase] Missing")) return;
    original(...args);
  });
}

describe("supabase browser client", () => {
  it("builds lazily on first access and reuses the client", async () => {
    const client = (await load()).supabase;
    expect(createClient).not.toHaveBeenCalled();
    expect((client as unknown as { tag: string }).tag).toBe("browser");
    void client.from;
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it("passes the VITE URL, publishable key and preview storage", async () => {
    void (await load()).supabase.from;
    const [url, key, opts] = createClient.mock.calls[0] ?? [];
    expect(url).toBe(PUBLIC);
    expect(key).toBe(KEY);
    expect(opts.auth).toEqual({
      storage: storageMarker,
      persistSession: true,
      autoRefreshToken: true,
    });
  });

  it("falls back to server env names when VITE names are empty", async () => {
    setEnv({
      SUPABASE_URL: "https://server.example.co",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_s",
    });
    void (await load()).supabase.from;
    const [url, key] = createClient.mock.calls[0] ?? [];
    expect(url).toBe("https://server.example.co");
    expect(key).toBe("sb_publishable_s");
  });

  it.each([
    [{}, "SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY."],
    [{ VITE_SUPABASE_PUBLISHABLE_KEY: KEY }, "SUPABASE_URL."],
    [{ VITE_SUPABASE_URL: PUBLIC }, "SUPABASE_PUBLISHABLE_KEY."],
  ])("throws naming missing variables (%j)", async (vals, text) => {
    setEnv(vals);
    const spy = silenceMissing();
    const client = (await load()).supabase;
    expect(() => client.from).toThrow(`Missing Supabase environment variable(s): ${text}`);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining(text));
  });
});

describe("client fetch wrapper headers (browser)", () => {
  it("keeps Authorization for a JWT-style key", async () => {
    setEnv({ VITE_SUPABASE_URL: PUBLIC, VITE_SUPABASE_PUBLISHABLE_KEY: "eyJ.anon.key" });
    const wrap = await wrapper();
    const spy = spyFetch();
    await wrap(`${PUBLIC}/rest`, { headers: { Authorization: "Bearer eyJ.anon.key" } });
    const h = callOf(spy)[1].headers as Headers;
    expect(h.get("authorization")).toBe("Bearer eyJ.anon.key");
    expect(h.get("apikey")).toBe("eyJ.anon.key");
  });

  it("strips the bearer form of the opaque key", async () => {
    const wrap = await wrapper();
    const spy = spyFetch();
    await wrap(`${PUBLIC}/rest`, { headers: { Authorization: `Bearer ${KEY}` } });
    expect((callOf(spy)[1].headers as Headers).has("authorization")).toBe(false);
  });

  it("keeps a user token with an opaque key", async () => {
    const wrap = await wrapper();
    const spy = spyFetch();
    await wrap(`${PUBLIC}/rest`, { headers: { Authorization: "Bearer user.jwt.t" } });
    expect((callOf(spy)[1].headers as Headers).get("authorization")).toBe("Bearer user.jwt.t");
  });

  it("merges Request and caller headers and never rewrites in the browser", async () => {
    setEnv({
      VITE_SUPABASE_URL: PUBLIC,
      VITE_SUPABASE_PUBLISHABLE_KEY: KEY,
      SUPABASE_URL: "http://local:54321",
      SUPABASE_PUBLISHABLE_KEY: KEY,
    });
    const wrap = await wrapper();
    const spy = spyFetch();
    const input = new Request(`${PUBLIC}/rest`, { headers: { a: "1" } });
    await wrap(input, { headers: { b: "2" } });
    const [sent, init] = callOf(spy);
    expect(sent).toBe(input);
    expect((init.headers as Headers).get("a")).toBe("1");
    expect((init.headers as Headers).get("b")).toBe("2");
  });
});

describe("client fetch wrapper URL rewrite (server side)", () => {
  async function serverWrapper(vals: Partial<Record<string, string>>): Promise<FetchFn> {
    setEnv(vals);
    vi.stubGlobal("window", undefined);
    try {
      return await wrapper();
    } finally {
      vi.unstubAllGlobals();
    }
  }
  const SERVER = {
    VITE_SUPABASE_URL: `${PUBLIC}/`,
    VITE_SUPABASE_PUBLISHABLE_KEY: KEY,
    SUPABASE_URL: "http://local:54321/",
    SUPABASE_PUBLISHABLE_KEY: KEY,
  };

  it("rewrites a public URL string to the server URL", async () => {
    const wrap = await serverWrapper(SERVER);
    const spy = spyFetch();
    await wrap(`${PUBLIC}/rest/v1/plates?x=1`);
    expect(callOf(spy)[0]).toBe("http://local:54321/rest/v1/plates?x=1");
    expect((callOf(spy)[1].headers as Headers).get("apikey")).toBe(KEY);
  });

  it("rewrites a URL object", async () => {
    const wrap = await serverWrapper(SERVER);
    const spy = spyFetch();
    await wrap(new URL(`${PUBLIC}/auth/v1/user`));
    expect(callOf(spy)[0]).toBe("http://local:54321/auth/v1/user");
  });

  it("rewrites a Request into a new Request at the server URL", async () => {
    const wrap = await serverWrapper(SERVER);
    const spy = spyFetch();
    await wrap(new Request(`${PUBLIC}/rest/v1/t`, { method: "POST", body: "{}" }));
    const sent = callOf(spy)[0] as Request;
    expect(sent).toBeInstanceOf(Request);
    expect(sent.url).toBe("http://local:54321/rest/v1/t");
    expect(sent.method).toBe("POST");
  });

  it("leaves URLs outside the public base alone", async () => {
    const wrap = await serverWrapper(SERVER);
    const spy = spyFetch();
    await wrap("https://elsewhere.example/x");
    expect(callOf(spy)[0]).toBe("https://elsewhere.example/x");
  });

  it.each([
    ["the server URL is unset", { ...SERVER, SUPABASE_URL: "" }],
    ["the server URL equals the public URL", { ...SERVER, SUPABASE_URL: PUBLIC }],
    ["the server key differs", { ...SERVER, SUPABASE_PUBLISHABLE_KEY: "sb_publishable_other" }],
  ])("does not rewrite when %s", async (_label, vals) => {
    const wrap = await serverWrapper(vals);
    const spy = spyFetch();
    await wrap(`${PUBLIC}/rest/v1/t`);
    expect(callOf(spy)[0]).toBe(`${PUBLIC}/rest/v1/t`);
  });
});
