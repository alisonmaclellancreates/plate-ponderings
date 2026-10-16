import { createFileRoute } from "@tanstack/react-router";
import { Explore } from "@/components/site/Explore";

const TITLE = "The Roadside Archive | What the Plate?";
const DESCRIPTION = "Revisit past Plates of the Day and see how their stories have grown in the What the Plate? Roadside Archive.";

export const Route = createFileRoute("/explore")({
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
  component: Explore,
});