import { createFileRoute, redirect } from "@tanstack/react-router";
import { LiveAdmin } from "@/components/site/LiveAdmin";
import { getAdminAccess } from "@/lib/admin.functions";

const TITLE = "Admin | What the Plate?";
const DESCRIPTION = "Reported stories awaiting review.";

export const Route = createFileRoute("/_authenticated/admin")({
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
  // Non-admins are sent home here, never by a redirect thrown from a server function.
  beforeLoad: async () => {
    const access = await getAdminAccess().catch(() => ({ admin: false }));
    if (!access.admin) throw redirect({ to: "/", replace: true });
  },
  component: () => <LiveAdmin />,
});
