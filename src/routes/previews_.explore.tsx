import { createFileRoute } from "@tanstack/react-router";
import { Explore } from "@/components/site/Explore";

export const Route = createFileRoute("/previews_/explore")({
  head: () => ({
    meta: [
      { title: "Archive sample preview | What the Plate?" },
      { name: "description", content: "Sample featured days in the Roadside Archive, with progress and Load More." },
      { property: "og:title", content: "Archive sample preview | What the Plate?" },
      { property: "og:description", content: "Sample featured days in the Roadside Archive, with progress and Load More." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Explore,
});