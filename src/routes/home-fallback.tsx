import { createFileRoute } from "@tanstack/react-router";
import { Homepage } from "@/components/site/Homepage";

export const Route = createFileRoute("/home-fallback")({
  head: () => ({
    meta: [
      { title: "Fallback Plate of the Day preview | What the Plate?" },
      { name: "description", content: "Homepage preview on a day with no mystery plate to feature." },
      { property: "og:title", content: "Fallback Plate of the Day preview | What the Plate?" },
      { property: "og:description", content: "Homepage preview on a day with no mystery plate to feature." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Homepage variant="fallback" />,
});
