import { expect, it, vi } from "vitest";
vi.mock("@/lib/featured.functions", () => ({ getFeaturedHome: vi.fn(), getFeaturedArchive: vi.fn() }));
import { QueryClient } from "@tanstack/react-query";
import { getFeaturedArchive, getFeaturedHome } from "@/lib/featured.functions";
import { featuredArchiveOptions, featuredHomeOptions } from "@/lib/featured-queries";
it("reads home through its cached server function", async () => {
  const home = { today: "2026-10-17", pick: null, recent: [] };
  vi.mocked(getFeaturedHome).mockResolvedValue(home);
  expect(await new QueryClient().ensureQueryData(featuredHomeOptions)).toEqual(home);
});
it("uses strict archive cursors and stops at the final page", async () => {
  vi.mocked(getFeaturedArchive).mockResolvedValue({ today: "2026-10-17", plates: [], next: "2026-10-05" });
  const client = new QueryClient();
  await client.ensureInfiniteQueryData(featuredArchiveOptions);
  expect(getFeaturedArchive).toHaveBeenCalledWith({ data: { before: undefined } });
  vi.mocked(getFeaturedArchive).mockResolvedValue({ today: "2026-10-17", plates: [], next: null });
  await client.fetchInfiniteQuery({ ...featuredArchiveOptions, pages: 2 });
  // Direct next-page policy is independent of row contents.
  expect(featuredArchiveOptions.getNextPageParam?.({ today: "x", plates: [], next: "2026-10-05" }, [], undefined, [])).toBe("2026-10-05");
  expect(featuredArchiveOptions.getNextPageParam?.({ today: "x", plates: [], next: null }, [], undefined, [])).toBeUndefined();
});