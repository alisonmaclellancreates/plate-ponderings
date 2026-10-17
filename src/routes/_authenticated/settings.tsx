import { createFileRoute } from "@tanstack/react-router";
import { LiveSettings } from "@/components/site/LiveSettings";

const TITLE = "Settings | What the Plate?";
const DESCRIPTION = "Blocked people and account settings.";

export const Route = createFileRoute("/_authenticated/settings")({
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
  component: () => <LiveSettings />,
});
