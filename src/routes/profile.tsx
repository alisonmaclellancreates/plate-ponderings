import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/site/Account";

const TITLE = "Your Profile | What the Plate?";
const DESCRIPTION = "Tell us how you'd like to appear in the community.";

export const Route = createFileRoute("/profile")({
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
  component: () => <ProfilePage />,
});
