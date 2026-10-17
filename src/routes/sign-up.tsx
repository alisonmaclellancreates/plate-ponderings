import { createFileRoute } from "@tanstack/react-router";
import { SignUpPage } from "@/components/site/Entry";
import { safeReturnPath } from "@/lib/account-rules";

const TITLE = "Create an Account | What the Plate?";
const DESCRIPTION = "Join the community and add your story.";

export const Route = createFileRoute("/sign-up")({
  validateSearch: (search: Record<string, unknown>) => ({ returnTo: safeReturnPath(search['returnTo']) }),
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
  component: SignUpRoute,
});
function SignUpRoute() { const { returnTo } = Route.useSearch(); return <SignUpPage returnTo={returnTo} />; }
