import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getFeaturedArchive, getFeaturedHome } from "./featured.functions";

export const featuredHomeOptions = queryOptions({
  queryKey: ["featured-home"],
  queryFn: () => getFeaturedHome(),
});

export const featuredArchiveOptions = infiniteQueryOptions({
  queryKey: ["featured-archive"],
  initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam }) => getFeaturedArchive({ data: { before: pageParam } }),
  getNextPageParam: (page) => page.next ?? undefined,
});
