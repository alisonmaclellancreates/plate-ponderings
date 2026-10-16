import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/components/site/InfoPages";

const TITLE = "About What the Plate?";
const DESCRIPTION =
  "The story behind What the Plate?: a place to collect the meanings behind personalized plates, built for #SheBuilds.";

export const Route = createFileRoute("/about")({
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
  component: () => <AboutPage />,
});
