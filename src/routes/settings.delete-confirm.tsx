import { createFileRoute } from "@tanstack/react-router";
import { DeleteConfirmPage } from "@/components/site/Settings";

const TITLE = "Delete your account? | What the Plate?";
const DESCRIPTION = "Confirm deleting your account.";

export const Route = createFileRoute("/settings/delete-confirm")({
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
  component: () => <DeleteConfirmPage />,
});
