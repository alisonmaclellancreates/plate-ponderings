import { createFileRoute } from "@tanstack/react-router";
import { DeleteConfirmPage } from "@/components/site/Settings";

/** Delete Account does nothing here. */
function DeleteConfirmSample() {
  return <DeleteConfirmPage onDelete={() => {}} />;
}

const TITLE = "Delete account sample preview | What the Plate?";
const DESCRIPTION = "The delete account confirmation with an inert Delete Account.";

export const Route = createFileRoute("/previews_/settings-delete-confirm")({
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
  component: DeleteConfirmSample,
});
