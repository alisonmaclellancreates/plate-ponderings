import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/site/Admin";

/** Sample rows only; Hide, Unhide and Recheck do nothing here. */
function AdminSample() {
  return <AdminPage onToggle={() => {}} onRecheck={() => {}} />;
}

const TITLE = "Admin sample preview | What the Plate?";
const DESCRIPTION = "Sample reported stories, visible and hidden, with inert actions.";

export const Route = createFileRoute("/previews_/admin")({
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
  component: AdminSample,
});
