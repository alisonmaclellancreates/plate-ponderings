import { createFileRoute, redirect } from "@tanstack/react-router";
import { safeReturnPath } from "@/lib/account-rules";
export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({ returnTo: safeReturnPath(search['returnTo'] ?? search['redirect']) }),
  beforeLoad: ({ search }) => { throw redirect({ to: "/sign-in", search: { returnTo: search.returnTo }, replace: true }); },
  head: () => ({ meta: [{ title: "Account access | What the Plate?" }, { name: "description", content: "Continue to your What the Plate? account." }, { property: "og:title", content: "Account access | What the Plate?" }, { property: "og:description", content: "Continue to your What the Plate? account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});