import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

function req(auth?: string): Request {
  return new Request("https://example.test/api/public/cron", {
    headers: auth === undefined ? {} : { authorization: auth },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authenticateCronRequest", () => {
  it("returns 500 when the current secret is not configured", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "");
    const res = await authenticateCronRequest(req("Bearer anything"));
    expect(res?.status).toBe(500);
    expect(await res?.text()).toBe("Server configuration error");
  });

  it("returns 401 when there is no authorization header", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "current");
    expect((await authenticateCronRequest(req()))?.status).toBe(401);
  });

  it("returns 401 for a non-bearer header", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "current");
    expect((await authenticateCronRequest(req("Basic current")))?.status).toBe(401);
  });

  it("returns 401 for tokens containing whitespace or commas", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "current");
    expect((await authenticateCronRequest(req("Bearer cur rent")))?.status).toBe(401);
    expect((await authenticateCronRequest(req("Bearer current,other")))?.status).toBe(401);
  });

  it("allows a token matching the current secret", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "current");
    expect(await authenticateCronRequest(req("Bearer current"))).toBeNull();
  });

  it("allows a token matching the previous secret during rotation", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "current");
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", "previous");
    expect(await authenticateCronRequest(req("Bearer previous"))).toBeNull();
  });

  it("returns 401 for a token matching neither secret", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "current");
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", "previous");
    const res = await authenticateCronRequest(req("Bearer wrong"));
    expect(res?.status).toBe(401);
    expect(await res?.text()).toBe("Unauthorized");
  });

  it("returns 401 for a wrong token when no previous secret is set", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "current");
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", "");
    // Empty previous falls back via ?? only for undefined; "" still must not match "wrong".
    expect((await authenticateCronRequest(req("Bearer wrong")))?.status).toBe(401);
  });
});
