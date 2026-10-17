import { createFileRoute } from "@tanstack/react-router";
import { SignInPage } from "@/components/site/Entry";
import { safeReturnPath } from "@/lib/account-rules";

const TITLE = "Sign In | What the Plate?";
const DESCRIPTION = "Welcome back. Sign in to What the Plate?.";

export const Route = createFileRoute("/sign-in")({
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
  component: SignInRoute,
});
function SignInRoute() { const { returnTo } = Route.useSearch(); return <SignInPage returnTo={returnTo} />; }
