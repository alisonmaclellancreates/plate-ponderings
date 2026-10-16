import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/site/Admin";

const TITLE = "Admin | What the Plate?";
const DESCRIPTION = "Reported stories awaiting review.";

export const Route = createFileRoute("/admin")({
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
  component: () => <AdminPage />,
});
