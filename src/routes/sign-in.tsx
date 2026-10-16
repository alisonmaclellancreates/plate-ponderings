import { createFileRoute } from "@tanstack/react-router";
import { SignInPage } from "@/components/site/Entry";

const TITLE = "Sign In | What the Plate?";
const DESCRIPTION = "Welcome back. Sign in to What the Plate?.";

export const Route = createFileRoute("/sign-in")({
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
  component: () => <SignInPage />,
});
