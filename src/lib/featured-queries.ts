import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getFeaturedArchive, getFeaturedHome } from "./featured.functions";
import type { FeaturedPage } from "./featured.functions";

export type FeaturedArchivePage = FeaturedPage & { error?: boolean };

export const featuredHomeOptions = queryOptions({
  queryKey: ["featured-home"],
  queryFn: async () => {
    try {
      return await getFeaturedHome();
    } catch {
      return { today: "", pick: null, recent: [] };
    }
  },
});

export const featuredArchiveOptions = infiniteQueryOptions({
  queryKey: ["featured-archive"],
  initialPageParam: undefined as string | undefined,
  queryFn: async ({ pageParam }): Promise<FeaturedArchivePage> => {
    try {
      return await getFeaturedArchive({ data: { before: pageParam } });
    } catch {
      return { today: "", plates: [], next: null, error: true };
    }
  },
  getNextPageParam: (page) => page.next ?? undefined,
});
