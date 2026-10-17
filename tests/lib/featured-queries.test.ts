import { expect, it, vi } from "vitest";
vi.mock("@/lib/featured.functions", () => ({
  getFeaturedHome: vi.fn(),
  getFeaturedArchive: vi.fn(),
}));
import { QueryClient } from "@tanstack/react-query";
import { getFeaturedArchive, getFeaturedHome } from "@/lib/featured.functions";
import { featuredArchiveOptions, featuredHomeOptions } from "@/lib/featured-queries";
it("reads home through its cached server function", async () => {
  const home = { today: "2026-10-17", pick: null, recent: [] };
  vi.mocked(getFeaturedHome).mockResolvedValue(home);
  expect(await new QueryClient().ensureQueryData(featuredHomeOptions)).toEqual(home);
});
it("contains a failed homepage read and recovers on the next read", async () => {
  vi.mocked(getFeaturedHome).mockRejectedValueOnce(new Error("Read failed"));
  const client = new QueryClient();
  expect(await client.ensureQueryData(featuredHomeOptions)).toEqual({
    today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    pick: null,
    recent: [],
  });
  const home = { today: "2026-10-17", pick: null, recent: [] };
  vi.mocked(getFeaturedHome).mockResolvedValueOnce(home);
  expect(await client.fetchQuery(featuredHomeOptions)).toEqual(home);
});
it("contains an initial archive failure and retries the server read", async () => {
  vi.mocked(getFeaturedArchive).mockRejectedValueOnce(new Error("Read failed"));
  const client = new QueryClient();
  const failed = await client.ensureInfiniteQueryData(featuredArchiveOptions);
  expect(failed.pages).toEqual([{ today: "", plates: [], next: null, error: true }]);
  vi.mocked(getFeaturedArchive).mockResolvedValueOnce({
    today: "2026-10-17",
    plates: [],
    next: null,
  });
  expect((await client.fetchInfiniteQuery(featuredArchiveOptions)).pages).toEqual([
    { today: "2026-10-17", plates: [], next: null },
  ]);
});
it("uses strict archive cursors and stops at the final page", async () => {
  vi.mocked(getFeaturedArchive).mockReset();
  vi.mocked(getFeaturedArchive).mockResolvedValue({
    today: "2026-10-17",
    plates: [],
    next: "2026-10-05",
  });
  const client = new QueryClient();
  await client.ensureInfiniteQueryData(featuredArchiveOptions);
  expect(getFeaturedArchive).toHaveBeenCalledWith({ data: { before: undefined } });
  vi.mocked(getFeaturedArchive).mockResolvedValue({ today: "2026-10-17", plates: [], next: null });
  await client.fetchInfiniteQuery({ ...featuredArchiveOptions, pages: 2 });
  // Direct next-page policy is independent of row contents.
  expect(
    featuredArchiveOptions.getNextPageParam?.(
      { today: "x", plates: [], next: "2026-10-05" },
      [],
      undefined,
      [],
    ),
  ).toBe("2026-10-05");
  expect(
    featuredArchiveOptions.getNextPageParam?.(
      { today: "x", plates: [], next: null },
      [],
      undefined,
      [],
    ),
  ).toBeUndefined();
});
it("retains earlier archive pages when a later read fails and recovers on retry", async () => {
  const first = { today: "2026-10-17", plates: [], next: "2026-10-05" };
  const second = { today: "2026-10-17", plates: [], next: null };
  vi.mocked(getFeaturedArchive)
    .mockResolvedValueOnce(first)
    .mockResolvedValueOnce(first)
    .mockRejectedValueOnce(new Error("Read failed"));
  const client = new QueryClient();
  await client.ensureInfiniteQueryData(featuredArchiveOptions);
  const failed = await client.fetchInfiniteQuery({ ...featuredArchiveOptions, pages: 2 });
  expect(failed.pages).toEqual([first, { today: "", plates: [], next: null, error: true }]);
  vi.mocked(getFeaturedArchive).mockResolvedValueOnce(first).mockResolvedValueOnce(second);
  expect((await client.fetchInfiniteQuery({ ...featuredArchiveOptions, pages: 2 })).pages).toEqual([
    first,
    second,
  ]);
});
