import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const f = await vi.hoisted(async () => {
  const { fakeSupabase } = await import("./fake-supabase");
  return { db: fakeSupabase(), tombstone: vi.fn() };
});
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: f.db.client }));
vi.mock("@/lib/tombstone.server", () => ({ tombstoneStories: f.tombstone }));
vi.mock("@tanstack/react-start", async () => {
  const { serverFnMock } = await import("./fake-supabase");
  return serverFnMock(() => ({ userId: "me", supabase: f.db.client }));
});

import { deleteAccount } from "@/lib/account-delete.functions";
import { deleteAccountData, deletePosthogPerson } from "@/lib/account-delete.server";
import { DEMO_MESSAGE } from "@/lib/account-rules";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const admin = f.db.client as unknown as SupabaseClient<Database>;
const fetchMock = vi.fn();
const errors = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  f.db.reset();
  f.tombstone.mockReset().mockResolvedValue(["p1"]);
  f.db.storage.list.mockResolvedValue({ data: [{ name: "a.jpg" }], error: null });
  f.db.storage.remove.mockResolvedValue({ error: null });
  f.db.deleteUser.mockResolvedValue({ error: null });
  f.db.rpc.mockResolvedValue({ data: false, error: null });
  fetchMock.mockReset();
  errors.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("POSTHOG_PERSONAL_API_KEY", "key");
  vi.stubEnv("POSTHOG_PROJECT_ID", "42");
  vi.stubEnv("POSTHOG_REGION", "us");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("deleteAccountData", () => {
  it("runs every step of the brief for the caller only", async () => {
    await deleteAccountData(admin, "me");
    expect(f.tombstone).toHaveBeenCalledWith(admin, { authorId: "me" });
    expect(f.db.ops("stories")[0]).toEqual([
      ["delete", []],
      ["eq", ["author_id", "me"]],
      ["in", ["status", ["pending", "rejected"]]],
    ]);
    const subjects = f.db.ops("subjects");
    expect(subjects[0]).toEqual([
      ["delete", []],
      ["eq", ["created_by", "me"]],
      ["in", ["status", ["pending", "rejected"]]],
    ]);
    expect(subjects[1]).toEqual([
      ["update", [{ created_by: null }]],
      ["eq", ["created_by", "me"]],
    ]);
    expect(f.db.storage.list).toHaveBeenCalledWith("me", { limit: 1000 });
    expect(f.db.storage.remove).toHaveBeenCalledWith(["me/a.jpg"]);
    expect(f.db.ops("hearts")[0]).toEqual([
      ["delete", []],
      ["eq", ["user_id", "me"]],
    ]);
    expect(f.db.ops("reports")[0]).toEqual([
      ["update", [{ reporter_id: null }]],
      ["eq", ["reporter_id", "me"]],
    ]);
    expect(f.db.ops("notifications")[0]).toContainEqual(["eq", ["user_id", "me"]]);
    expect(f.db.ops("blocks")[0]).toContainEqual(["or", ["blocker_id.eq.me,blocked_id.eq.me"]]);
    expect(f.db.ops("profiles")[0]).toContainEqual(["eq", ["id", "me"]]);
    expect(f.db.deleteUser).toHaveBeenCalledWith("me");
  });
  it("skips photo removal when the folder is empty or unreadable as empty", async () => {
    f.db.storage.list.mockResolvedValue({ data: [], error: null });
    await deleteAccountData(admin, "me");
    f.db.storage.list.mockResolvedValue({ data: null, error: null });
    await deleteAccountData(admin, "me");
    expect(f.db.storage.remove).not.toHaveBeenCalled();
  });
  it("throws on a tombstone read error before touching anything else", async () => {
    f.tombstone.mockResolvedValue(null);
    await expect(deleteAccountData(admin, "me")).rejects.toThrow("tombstones");
    expect(f.db.calls).toEqual([]);
  });
  it.each([
    ["unpublished stories", () => f.db.queue("stories", { error: { m: 1 } })],
    ["unpublished plates", () => f.db.queue("subjects", { error: { m: 1 } })],
    ["photo list", () => f.db.storage.list.mockResolvedValue({ data: null, error: { m: 1 } })],
    ["photos", () => f.db.storage.remove.mockResolvedValue({ error: { m: 1 } })],
    ["hearts", () => f.db.queue("hearts", { error: { m: 1 } })],
    ["published plates", () => f.db.queue("subjects", { error: null }, { error: { m: 1 } })],
    ["reports", () => f.db.queue("reports", { error: { m: 1 } })],
    ["notifications", () => f.db.queue("notifications", { error: { m: 1 } })],
    ["blocks", () => f.db.queue("blocks", { error: { m: 1 } })],
    ["profile", () => f.db.queue("profiles", { error: { m: 1 } })],
    ["auth user", () => f.db.deleteUser.mockResolvedValue({ error: { m: 1 } })],
  ])("throws at %s", async (step, fail) => {
    fail();
    await expect(deleteAccountData(admin, "me")).rejects.toThrow(`failed at ${step}`);
  });
});

describe("deletePosthogPerson", () => {
  const ok = (body: unknown) => ({ ok: true, status: 200, json: () => Promise.resolve(body) });
  it("finds the person by distinct id and deletes them with their events (US)", async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ results: [{ id: "p-1" }] }))
      .mockResolvedValueOnce({ ok: true, status: 204 });
    await deletePosthogPerson("me");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://us.posthog.com/api/projects/42/persons/?distinct_id=me",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({ headers: { Authorization: "Bearer key" } });
    expect(fetchMock.mock.calls[1]).toEqual([
      "https://us.posthog.com/api/projects/42/persons/p-1/?delete_events=true",
      { method: "DELETE", headers: { Authorization: "Bearer key" } },
    ]);
    expect(errors).not.toHaveBeenCalled();
  });
  it("uses the EU host otherwise, and tolerates no matching person", async () => {
    vi.stubEnv("POSTHOG_REGION", "eu");
    fetchMock.mockResolvedValueOnce(ok({}));
    await deletePosthogPerson("me");
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/^https:\/\/eu\.posthog\.com\//);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("logs and skips when not configured", async () => {
    vi.stubEnv("POSTHOG_PERSONAL_API_KEY", "");
    await deletePosthogPerson("me");
    vi.stubEnv("POSTHOG_PERSONAL_API_KEY", "key");
    vi.stubEnv("POSTHOG_PROJECT_ID", "");
    await deletePosthogPerson("me");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errors).toHaveBeenCalledWith("PostHog person deletion skipped: not configured");
  });
  it("logs lookup and delete failures without throwing", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
    await deletePosthogPerson("me");
    fetchMock
      .mockResolvedValueOnce(ok({ results: [{ id: "p-1" }] }))
      .mockResolvedValueOnce({ ok: false, status: 500 });
    await deletePosthogPerson("me");
    expect(errors.mock.calls.map((c) => String(c[1]))).toEqual([
      "Error: lookup 401",
      "Error: delete 500",
    ]);
  });
});

describe("deleteAccount", () => {
  it("refuses demo and role errors before deleting anything", async () => {
    f.db.rpc.mockResolvedValue({ data: true, error: null });
    expect(await deleteAccount()).toEqual({ outcome: "demo", message: DEMO_MESSAGE });
    f.db.rpc.mockResolvedValue({ data: null, error: { m: 1 } });
    expect(await deleteAccount()).toEqual({ outcome: "error" });
    expect(f.tombstone).not.toHaveBeenCalled();
  });
  it("deletes the account and then the PostHog person", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [] }) });
    expect(await deleteAccount()).toEqual({ outcome: "deleted" });
    expect(f.db.deleteUser).toHaveBeenCalledWith("me");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("still reports deleted when PostHog fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect(await deleteAccount()).toEqual({ outcome: "deleted" });
    expect(errors).toHaveBeenCalledWith("PostHog person deletion failed", expect.any(Error));
  });
  it("reports an error, without PostHog, when a step fails", async () => {
    f.db.deleteUser.mockResolvedValue({ error: { m: 1 } });
    expect(await deleteAccount()).toEqual({ outcome: "error" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
