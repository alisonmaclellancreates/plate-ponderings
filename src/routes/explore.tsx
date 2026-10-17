import { createFileRoute } from "@tanstack/react-router";
import { Explore } from "@/components/site/Explore";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { featuredArchiveOptions } from "@/lib/featured-queries";

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
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery(featuredArchiveOptions);
  return (
    <Explore
      live={{
        plates: data.pages.flatMap((page) => page.plates),
        today: data.pages[0].today,
        hasMore: hasNextPage,
        busy: isFetchingNextPage,
        loadMore: fetchNextPage,
      }}
    />
  );
}
