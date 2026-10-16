import { createFileRoute } from "@tanstack/react-router";
import { NotFoundPage } from "@/components/site/InfoPages";

const TITLE = "This road doesn't go anywhere | What the Plate?";
const DESCRIPTION = "The page you're looking for doesn't exist.";

export const Route = createFileRoute("/not-found")({
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
  component: () => <NotFoundPage />,
});
