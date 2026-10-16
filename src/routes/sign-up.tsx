import { createFileRoute } from "@tanstack/react-router";
import { SignUpPage } from "@/components/site/Entry";

const TITLE = "Create an Account | What the Plate?";
const DESCRIPTION = "Join the community and add your story.";

export const Route = createFileRoute("/sign-up")({
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
  component: () => <SignUpPage />,
});
