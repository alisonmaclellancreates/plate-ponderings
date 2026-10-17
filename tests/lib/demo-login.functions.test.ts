import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { fakeSupabase, serverFnMock } from "./fake-supabase";
const m = vi.hoisted(() => ({ login: vi.fn(), create: vi.fn() }));
const db = fakeSupabase();
vi.mock("@tanstack/react-start", () => serverFnMock(() => ({})));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: db.client }));
vi.mock("@supabase/supabase-js", () => ({ createClient: m.create }));
import { startDemo } from "@/lib/demo-login.functions";
beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  vi.stubEnv("DEMO_EMAIL", "demo@fixture.invalid");
  vi.stubEnv("DEMO_PASSWORD", "fixture-only");
  vi.stubEnv("SUPABASE_URL", "https://fixture.invalid");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "fixture-key");
  m.create.mockReturnValue({ auth: { signInWithPassword: m.login } });
  m.login.mockResolvedValue({
    data: {
      session: {
        user: { id: "demo-id" },
        access_token: "test-access",
        refresh_token: "test-refresh",
      },
    },
    error: null,
  });
  db.queue("app_settings", { data: { demo_mode: true } });
  db.rpc.mockResolvedValue({ data: true, error: null });
  db.queue("profiles", { data: { handle: "Traveler4821" } });
});
afterEach(() => vi.unstubAllEnvs());
it("uses an isolated auth client and returns session tokens only", async () => {
  expect(await startDemo()).toEqual({ access_token: "test-access", refresh_token: "test-refresh" });
  expect(m.create).toHaveBeenCalledWith("https://fixture.invalid", "fixture-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
});
it.each([
  "mode",
  "settings",
  "email",
  "password",
  "login",
  "session",
  "role",
  "role-error",
  "handle",
  "profile-error",
])("fails safely for %s", async (failure) => {
  db.reset();
  db.queue("app_settings", {
    data: { demo_mode: failure !== "mode" },
    error: failure === "settings" ? {} : null,
  });
  db.queue("profiles", {
    data: { handle: failure === "handle" ? "Other" : "Traveler4821" },
    error: failure === "profile-error" ? {} : null,
  });
  db.rpc.mockResolvedValue({
    data: failure !== "role",
    error: failure === "role-error" ? {} : null,
  });
  if (failure === "email") vi.stubEnv("DEMO_EMAIL", "");
  if (failure === "password") vi.stubEnv("DEMO_PASSWORD", "");
  if (failure === "login" || failure === "session")
    m.login.mockResolvedValue({ data: { session: null }, error: failure === "login" ? {} : null });
  await expect(startDemo()).rejects.toThrow("not available");
});
