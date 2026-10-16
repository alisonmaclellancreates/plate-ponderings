import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();

type Handler = (args: { next: (opts: unknown) => unknown }) => Promise<unknown>;

beforeEach(() => {
  vi.resetModules();
  getSession.mockReset();
  vi.doMock("@tanstack/react-start", () => ({
    createMiddleware: () => ({ client: (fn: Handler) => fn }),
  }));
  vi.doMock("@/integrations/supabase/client", () => ({
    supabase: { auth: { getSession } },
  }));
});

afterEach(() => {
  vi.doUnmock("@tanstack/react-start");
  vi.doUnmock("@/integrations/supabase/client");
});

async function load(): Promise<Handler> {
  const mod = await import("@/integrations/supabase/auth-attacher");
  return mod.attachSupabaseAuth as unknown as Handler;
}

describe("attachSupabaseAuth", () => {
  it("adds a bearer header when a session exists", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "tok-123" } } });
    const next = vi.fn(() => "result");
    const out = await (await load())({ next });
    expect(next).toHaveBeenCalledWith({ headers: { Authorization: "Bearer tok-123" } });
    expect(out).toBe("result");
  });

  it("sends no headers when there is no session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const next = vi.fn();
    await (
      await load()
    )({ next });
    expect(next).toHaveBeenCalledWith({ headers: {} });
  });
});
