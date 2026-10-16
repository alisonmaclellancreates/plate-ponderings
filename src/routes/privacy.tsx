import { createFileRoute } from "@tanstack/react-router";
import { PrivacyPage } from "@/components/site/InfoPages";

const TITLE = "Privacy | What the Plate?";
const DESCRIPTION =
  "What we store, how photos are handled, what the AI sees, blocking, and deleting your stories and account.";

export const Route = createFileRoute("/privacy")({
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
  component: () => <PrivacyPage />,
});
