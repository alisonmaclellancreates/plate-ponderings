import { createFileRoute } from "@tanstack/react-router";
import { Explore } from "@/components/site/Explore";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { featuredArchiveOptions, type FeaturedArchivePage } from "@/lib/featured-queries";

const TITLE = "The Roadside Archive | What the Plate?";
const DESCRIPTION =
  "Revisit past Plates of the Day and see how their stories have grown in the What the Plate? Roadside Archive.";

export const Route = createFileRoute("/explore")({
  loader: ({ context }) => context.queryClient.ensureInfiniteQueryData(featuredArchiveOptions),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveExplore,
});

function LiveExplore() {
  const { data, hasNextPage, isFetching, fetchNextPage, refetch } =
    useSuspenseInfiniteQuery(featuredArchiveOptions);
  // A resolved suspense infinite query always holds its first page.
  const [first] = data.pages as [FeaturedArchivePage, ...FeaturedArchivePage[]];
  const failed = data.pages.some((page) => page.error);
  return (
    <Explore
      live={{
        plates: data.pages.flatMap((page) => page.plates),
        today: first.today,
        hasMore: hasNextPage && !failed,
        busy: isFetching,
        loadMore: fetchNextPage,
        error: failed,
        retry: refetch,
      }}
    />
  );
}
