import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { checkSignedIn } from "@/lib/session-check";
import { safeReturnPath } from "@/lib/account-rules";

// Missing-layout bootstrap for the first protected child routes. Keep this
// client-only: the persisted auth session is not available during SSR.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await checkSignedIn();
    if (!user) throw redirect({ to: "/auth", search: { returnTo: safeReturnPath(location.href) } });
  },
  component: Outlet,
});
