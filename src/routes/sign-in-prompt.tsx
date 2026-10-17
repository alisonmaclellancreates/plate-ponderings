import { createFileRoute } from "@tanstack/react-router";
import { SignInPromptPage } from "@/components/site/Entry";

const TITLE = "Sign in to add your story | What the Plate?";
const DESCRIPTION =
  "Choose how you would like to continue. After signing in, you will return here to add your story.";

export const Route = createFileRoute("/sign-in-prompt")({
  validateSearch: (search: Record<string, unknown>): { plate?: string | undefined } => ({
    plate: typeof search["plate"] === "string" ? search["plate"].slice(0, 64) : undefined,
  }),
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
  component: SignInPromptRoute,
});

function SignInPromptRoute() {
  const { plate } = Route.useSearch();
  return <SignInPromptPage plateId={plate} />;
}
