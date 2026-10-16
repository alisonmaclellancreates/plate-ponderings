import { createFileRoute } from "@tanstack/react-router";
import { Homepage } from "@/components/site/Homepage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "What the Plate? Every plate has a story" },
      { name: "description", content: "Look up personalized license plates from the US and Canada and share what you think they mean." },
      { property: "og:title", content: "What the Plate? Every plate has a story" },
      { property: "og:description", content: "Look up personalized license plates from the US and Canada and share what you think they mean." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Homepage />,
});
