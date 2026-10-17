import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: m }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (data: unknown) => data;
    const builder = {
      inputValidator: (fn: typeof validate) => {
        validate = fn;
        return builder;
      },
      handler: (fn: (args: { data: unknown }) => unknown) => (args?: { data: unknown }) =>
        fn({ data: validate(args?.data) }),
    };
    return builder;
  },
}));
import { getFeaturedArchive, getFeaturedHome } from "@/lib/featured.functions";
const row = (day: string, count = 0, owner = false) => ({
  day,
  subject_id: day,
  stories_at_pick: 0,
  jurisdiction: "Washington",
  plate_text: "TEST",
  story_count: count,
  has_owner_story: owner,
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
});
it("selects today and only the four prior UTC calendar dates, without backfilling gaps", async () => {
  m.rpc
    .mockResolvedValueOnce({ data: [{ day: "2026-10-17" }], error: null })
    .mockResolvedValueOnce({
      data: [
        row("2026-10-17"),
        row("2026-10-16", 1),
        row("2026-10-14", 2, true),
        row("2026-10-12"),
      ],
      error: null,
    });
  const result = await getFeaturedHome();
  expect(result.today).toBe("2026-10-17");
  expect(result.pick?.status).toBe("mystery");
  expect(result.recent.map((p) => [p.day, p.status])).toEqual([
    ["2026-10-16", "interpreted"],
    ["2026-10-14", "owner"],
  ]);
  expect(m.rpc).toHaveBeenNthCalledWith(1, "pick_featured_subject_for_today");
});
it.each([null, []])(
  "uses UTC today and omits the band for an empty eligible pool (%j)",
  async (data) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T00:00:01Z"));
    m.rpc
      .mockResolvedValueOnce({ data, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    expect(await getFeaturedHome()).toEqual({ today: "2026-10-18", pick: null, recent: [] });
    vi.useRealTimers();
  },
);
it.each([0, 1])("distinguishes homepage read failure %i from no pick", async (failure) => {
  m.rpc
    .mockResolvedValueOnce({ data: null, error: failure === 0 ? {} : null })
    .mockResolvedValueOnce({ data: null, error: {} });
  await expect(getFeaturedHome()).rejects.toThrow("couldn't load");
});
it("returns twelve rows and a strict next cursor only when a thirteenth exists", async () => {
  const rows = Array.from({ length: 13 }, (_, i) =>
    row(`2026-10-${String(17 - i).padStart(2, "0")}`),
  );
  m.rpc
    .mockResolvedValueOnce({ data: [{ day: "2026-10-17" }], error: null })
    .mockResolvedValueOnce({ data: rows, error: null });
  const first = await getFeaturedArchive({ data: {} });
  expect(first.plates).toHaveLength(12);
  expect(first.next).toBe("2026-10-06");
  m.rpc.mockResolvedValueOnce({ data: [rows[12]], error: null });
  expect((await getFeaturedArchive({ data: { before: "2026-10-06" } })).next).toBeNull();
  expect(m.rpc).toHaveBeenLastCalledWith("get_featured_subject_days", {
    _before: "2026-10-06",
    _limit: 13,
  });
});

  const rows = [row("2026-10-17"), row("2026-10-16", 1)];
  m.rpc
    .mockResolvedValueOnce({ data: [{ day: "2026-10-17" }], error: null })
    .mockResolvedValueOnce({ data: rows, error: null });
  const first = await getFeaturedArchive({ data: {} });
  expect(first.today).toBe("2026-10-17");
  expect(first.plates).toHaveLength(2);
  expect(m.rpc).toHaveBeenNthCalledWith(1, "pick_featured_subject_for_today");
  expect(m.rpc).toHaveBeenNthCalledWith(2, "get_featured_subject_days", { _limit: 13 });
});

it("keeps the archive loading when the pick fails on the first page", async () => {
  m.rpc
    .mockResolvedValueOnce({ data: null, error: {} })
    .mockResolvedValueOnce({ data: [row("2026-10-16", 1)], error: null });
  const first = await getFeaturedArchive({ data: {} });
  expect(first.plates).toHaveLength(1);
  expect(first.today).toBe(new Date().toISOString().slice(0, 10));
});

it("does not pick on later pages", async () => {
  m.rpc.mockResolvedValueOnce({ data: [row("2026-10-16")], error: null });
  const page = await getFeaturedArchive({ data: { before: "2026-10-16" } });
  expect(page.today).toBe(new Date().toISOString().slice(0, 10));
  expect(m.rpc).toHaveBeenCalledOnce();
});

it.each([null, []])("returns an empty archive with no next cursor (%j)", async (data) => {
  m.rpc.mockResolvedValue({ data, error: null });
  expect((await getFeaturedArchive({ data: {} })).plates).toEqual([]);
  expect((await getFeaturedArchive({ data: {} })).next).toBeNull();
});
it.each(["bad", "2026-02-30", "2026-13-01", "2026-1-01"])(
  "refuses invalid cursor %s before reading",
  async (before) => {
    await expect(async () => getFeaturedArchive({ data: { before } })).rejects.toThrow(
      "Invalid feature date",
    );
    expect(m.rpc).not.toHaveBeenCalled();
  },
);
it("reports archive read failures", async () => {
  m.rpc.mockResolvedValue({ data: null, error: {} });
  await expect(getFeaturedArchive({ data: {} })).rejects.toThrow("couldn't load");
});
