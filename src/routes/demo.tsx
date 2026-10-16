import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/site/Entry";

const TITLE = "Try the Demo | What the Plate?";
const DESCRIPTION = "Look around What the Plate? as a sample traveler.";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <DemoPage />,
});
