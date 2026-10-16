import { createFileRoute } from "@tanstack/react-router";
import { SignInPromptPage } from "@/components/site/Entry";

const TITLE = "Sign in to add your story | What the Plate?";
const DESCRIPTION =
  "Choose how you would like to continue. Your story will be added to this plate.";

export const Route = createFileRoute("/sign-in-prompt")({
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
  component: () => <SignInPromptPage />,
});
