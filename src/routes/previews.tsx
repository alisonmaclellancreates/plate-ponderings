import { createFileRoute } from "@tanstack/react-router";
import { PreviewIndex } from "@/components/previews/PreviewIndex";

const TITLE = "Previews | What the Plate?";
const DESCRIPTION = "Sample screens of What the Plate?, built from the real pages and sample plates.";

export const Route = createFileRoute("/previews")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PreviewIndex,
});
