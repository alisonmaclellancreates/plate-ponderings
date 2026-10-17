import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
const m = vi.hoisted(() => ({
  settings: vi.fn(),
  sample: vi.fn(),
  admins: vi.fn(),
  rpc: vi.fn(),
  users: vi.fn(),
  create: vi.fn(),
  removeUser: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  upload: vi.fn(),
  download: vi.fn(),
  photos: vi.fn(),
  replace: vi.fn(),
  counts: vi.fn(),
}));
vi.mock("@/lib/seed-photos.server", () => ({ seedPhotos: m.photos }));
import { resetDemoSeed } from "@/lib/demo-reset.server";
const content = new Map<string, unknown[]>();
const files = new Set<string>();
const users = new Map<string, { id: string; email?: string }>();
const handles = new Map<string, string>();
let counter = 0;
const from = (table: string) => {
  let count = false;
  let target = "";
  let update: { handle: string } | undefined;
  const b = {
    select: (_: string, options?: { count?: string }) => {
      count = Boolean(options?.count);
      return b;
    },
    eq: (_: string, value: string) => {
      target = value;
      return b;
    },
    single: () => b,
    update: (value: { handle: string }) => {
      update = value;
      return b;
    },
    then: (resolve: (v: unknown) => void) => {
      if (table === "profiles" && update) {
        if ([...handles].some(([id, handle]) => id !== target && handle === update?.handle))
          return Promise.resolve({ error: { message: "duplicate handle" } }).then(resolve);
        handles.set(target, update.handle);
      }
      const result = count
        ? m.counts(table)
        : table === "app_settings"
          ? m.settings()
          : table === "user_roles"
            ? m.admins()
            : m.sample();
      return Promise.resolve(result).then(resolve);
    },
  };
  return b;
};
const client = {
  from,
  rpc: m.rpc,
  auth: { admin: { listUsers: m.users, createUser: m.create, deleteUser: m.removeUser } },
  storage: {
    from: () => ({ list: m.list, remove: m.remove, upload: m.upload, download: m.download }),
  },
} as unknown as SupabaseClient<Database>;
beforeEach(() => {
  vi.clearAllMocks();
  counter = 0;
  content.clear();
  files.clear();
  users.clear();
  handles.clear();
  users.set("sample", { id: "sample", email: "sample@fixture.invalid" });
  users.set("admin", { id: "admin" });
  users.set("unrelated", { id: "unrelated" });
  handles.set("sample", "Traveler4821");
  files.add("old/old.jpg");
  vi.stubEnv("DEMO_EMAIL", "sample@fixture.invalid");
  vi.stubEnv("DEMO_PASSWORD", "test-only");
  m.photos.mockReturnValue(
    Object.fromEntries(
      ["RAINY7Q", "EH2ZED", "2FOG4ME", "MAPLE9X", "YEEHA7Z"].map((p) => [
        p,
        new Uint8Array([1, 2, 3]),
      ]),
    ),
  );
  m.settings.mockReturnValue({ data: { demo_mode: true, demo_today: "2026-10-17" }, error: null });
  m.sample.mockReturnValue({ data: { handle: "Traveler4821" }, error: null });
  m.admins.mockReturnValue({ data: [{ user_id: "admin" }], error: null });
  m.users.mockImplementation(async () => ({ data: { users: [...users.values()] }, error: null }));
  m.create.mockImplementation(async () => {
    const user = { id: crypto.randomUUID() };
    counter++;
    users.set(user.id, user);
    return { data: { user }, error: null };
  });
  m.removeUser.mockImplementation(async (id: string) => {
    users.delete(id);
    handles.delete(id);
    return { error: null };
  });
  m.rpc.mockImplementation(async (fn: string, args: { _seed?: Record<string, unknown[]> }) => {
    if (fn === "replace_demo_seed_content") {
      for (const [key, rows] of Object.entries(args._seed ?? {})) content.set(key, rows);
      return m.replace();
    }
    return { data: true, error: null };
  });
  m.replace.mockReturnValue({ error: null });
  m.counts.mockImplementation((table: string) => ({
    count: content.get(table)?.length ?? 0,
    error: null,
  }));
  m.list.mockImplementation(async (prefix: string) => {
    const names = [...files]
      .filter((p) => !prefix || p.startsWith(`${prefix}/`))
      .map((p) => (prefix ? p.slice(prefix.length + 1) : p));
    return {
      data: [...new Set(names.map((p) => p.split("/")[0]))].map((name) => ({
        name,
        id: prefix ? name : null,
      })),
      error: null,
    };
  });
  m.remove.mockImplementation(async (paths: string[]) => {
    paths.forEach((p) => files.delete(p));
    return { error: null };
  });
  m.upload.mockImplementation(async (path: string) => {
    files.add(path);
    return { error: null };
  });
  m.download.mockImplementation(async (path: string) => ({ error: files.has(path) ? null : {} }));
});
afterEach(() => vi.unstubAllEnvs());
it("replaces unrelated content, preserves admins/sample/settings and leaves exactly five photos on repeated reset", async () => {
  content.set("stories", [{ unrelated: true }]);
  expect((await resetDemoSeed(client)).outcome).toBe("done");
  expect(files.size).toBe(5);
  expect(files.has("old/old.jpg")).toBe(false);
  expect(content.get("subjects")).toHaveLength(16);
  expect(content.get("stories")).toHaveLength(17);
  expect(m.removeUser).toHaveBeenCalledWith("unrelated");
  expect(m.removeUser).not.toHaveBeenCalledWith("admin");
  expect(m.removeUser).not.toHaveBeenCalledWith("sample");
  expect((await resetDemoSeed(client)).outcome).toBe("done");
  expect(files.size).toBe(5);
  expect(users.size).toBe(12);
  expect(new Set(handles.values()).size).toBe(11);
  for (const story of content.get("stories") ?? []) {
    const row = story as {
      photo_path: string | null;
      author_id: string;
      photo_box: number[] | null;
    };
    if (row.photo_path) {
      expect(row.photo_path).toMatch(new RegExp(`^${row.author_id}/[0-9a-f-]+\\.jpg$`));
      expect(files.has(row.photo_path)).toBe(true);
      expect(row.photo_box).toHaveLength(4);
      expect(row.photo_box?.every((n) => n >= 0 && n <= 1)).toBe(true);
    }
  }
  expect(counter).toBe(20);
  expect(m.rpc).toHaveBeenCalledWith("release_demo_reset", expect.anything());
});
it.each([
  "off",
  "date",
  "email",
  "password",
  "sample",
  "identity",
  "admin-sample",
  "busy",
  "media",
])("refuses %s before destructive work", async (failure) => {
  if (failure === "off" || failure === "date")
    m.settings.mockReturnValue({
      data: { demo_mode: failure !== "off", demo_today: failure === "date" ? null : "2026-10-17" },
    });
  if (failure === "email") vi.stubEnv("DEMO_EMAIL", "");
  if (failure === "password") vi.stubEnv("DEMO_PASSWORD", "");
  if (failure === "sample") m.users.mockResolvedValue({ data: { users: [] }, error: null });
  if (failure === "identity") m.sample.mockReturnValue({ data: { handle: "Wrong" } });
  if (failure === "admin-sample") m.admins.mockReturnValue({ data: [{ user_id: "sample" }] });
  if (failure === "busy")
    m.rpc.mockImplementation(async (fn: string) => ({
      data: fn !== "claim_demo_reset",
      error: null,
    }));
  if (failure === "media")
    m.photos.mockImplementation(() => {
      throw new Error();
    });
  const result = await resetDemoSeed(client);
  expect(result.outcome).toBe("error");
  if (failure === "date")
    expect(result.message).toBe("Set the demo date before resetting seed data.");
  expect(m.create).not.toHaveBeenCalled();
  expect(m.remove).not.toHaveBeenCalled();
  expect(m.removeUser).not.toHaveBeenCalled();
});
it.each(["lease", "upload", "replace", "delete", "readback"])(
  "reports incomplete %s and permits retry",
  async (failure) => {
    if (failure === "lease")
      m.rpc
        .mockImplementationOnce(async () => ({ data: true }))
        .mockImplementationOnce(async () => ({ data: true }))
        .mockImplementationOnce(async () => ({ data: false }));
    if (failure === "upload") m.upload.mockResolvedValueOnce({ error: {} });
    if (failure === "replace") m.replace.mockReturnValueOnce({ error: {} });
    if (failure === "delete") m.removeUser.mockResolvedValueOnce({ error: {} });
    if (failure === "readback") m.counts.mockReturnValueOnce({ count: 0 });
    expect((await resetDemoSeed(client)).outcome).toBe("error");
    expect((await resetDemoSeed(client)).outcome).toBe("done");
  },
);

it.each(["returned", "thrown"])(
  "reports a %s lease release failure instead of done",
  async (kind) => {
    const original = m.rpc.getMockImplementation();
    m.rpc.mockImplementation(async (fn: string, args: { _seed?: Record<string, unknown[]> }) => {
      if (fn === "release_demo_reset") {
        if (kind === "thrown") throw new Error("release failed");
        return { error: {} };
      }
      return original?.(fn, args);
    });
    expect(await resetDemoSeed(client)).toEqual({
      outcome: "error",
      message:
        "Reset lease release failed. Wait for the lease to expire, then retry Reset seed data.",
    });
  },
);
