import { createFileRoute } from "@tanstack/react-router";
import { Homepage } from "@/components/site/Homepage";

export const Route = createFileRoute("/home-no-match")({
  head: () => ({
    meta: [
      { title: "No plate found preview | What the Plate?" },
      { name: "description", content: "Homepage preview when a plate search finds no match." },
      { property: "og:title", content: "No plate found preview | What the Plate?" },
      {
        property: "og:description",
        content: "Homepage preview when a plate search finds no match.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Homepage variant="no-match" />,
});
