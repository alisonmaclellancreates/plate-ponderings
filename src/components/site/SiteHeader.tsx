import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, UserRound, X } from "lucide-react";
import { useAccountAuth } from "@/lib/account-auth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUnreadDot } from "@/lib/submissions.functions";
import { UNREAD_DOT_KEY } from "@/lib/submissions-queries";
import { useMenuDismiss } from "@/lib/menu-dismiss";

// Explore, Spot a Plate and About are built in later steps; plain anchors until then.
const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/spot", label: "Spot a Plate" },
  { href: "/about", label: "About" },
];

const headerFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream";

function Avatar({
  showHandle,
  handle = "",
  dot = false,
}: {
  showHandle: boolean;
  handle?: string;
  dot?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-navy">
        <UserRound aria-hidden className="size-5" />
        {dot && (
          <span
            data-testid="unread-dot"
            className="absolute right-0 top-0 size-2.5 rounded-full border-2 border-cream bg-coral-cta"
          >
            <span className="sr-only">New updates</span>
          </span>
        )}
      </span>
      <span
        className={showHandle ? "font-semibold" : "max-w-20 truncate font-semibold"}
        title={handle}
      >
        {handle}
      </span>
    </span>
  );
}

const signIn = `site-nav-link rounded-md px-2 py-1 ${headerFocus}`;
const tryDemo = `rounded-lg border-2 border-cream px-3 py-1.5 font-semibold text-cream ${headerFocus}`;

export function MemberProfile({ showHandle }: { showHandle: boolean }) {
  const auth = useAccountAuth();
  const [open, setOpen] = useState(false);
  const location = useRouterState({ select: (state) => state.location });
  useEffect(() => {
    setOpen(false);
  }, [location]);
  const [error, setError] = useState("");
  const fetchDot = useServerFn(getUnreadDot);
  const signedIn = Boolean(auth?.account);
  const dot = useQuery({
    queryKey: UNREAD_DOT_KEY,
    queryFn: () => fetchDot(),
    enabled: signedIn,
  });
  const containerRef = useRef<HTMLDivElement | null>(null);
  useMenuDismiss(open, setOpen, containerRef);
  if (!auth?.account) return null;
  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        className={`h-auto rounded-full p-0 text-cream ${headerFocus}`}
        aria-label={`${auth.account.handle} menu`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar
          showHandle={showHandle}
          handle={auth.account.handle}
          dot={dot.data?.unread === true}
        />
      </Button>
      {open && (
        <ul
          aria-label="Profile"
          className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-border bg-card py-1 text-navy shadow-lg"
        >
          <li>
            <Link
              to="/submissions"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 hover:bg-cream"
            >
              Your Submissions
              {dot.data?.unread === true && (
                <span data-testid="menu-unread-dot" className="size-2.5 rounded-full bg-coral-cta">
                  <span className="sr-only">New updates</span>
                </span>
              )}
            </Link>
          </li>
          <li>
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 hover:bg-cream"
            >
              Your Profile
            </Link>
          </li>
          {auth.account.isAdmin && !auth.account.isDemo && (
            <li>
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 hover:bg-cream"
              >
                Admin
              </Link>
            </li>
          )}
          <li className="border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start px-4 text-navy"
              onClick={() => {
                setError("");
                void auth.signOut().catch(() => setError("We couldn't sign you out. Try again."));
              }}
            >
              {auth.account.isDemo ? "Exit Demo" : "Sign out"}
            </Button>
          </li>
          {error && (
            <li role="alert" className="px-4 py-2">
              {error}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
export function SiteHeader() {
  const auth = useAccountAuth();
  const mode = auth?.account ? (auth.account.isDemo ? "demo" : "member") : "signed-out";
  const demoEnabled = auth?.demoEnabled;
  const [open, setOpen] = useState(false);
  const location = useRouterState({ select: (state) => state.location });
  useEffect(() => {
    setOpen(false);
  }, [location]);
  const containerRef = useRef<HTMLElement | null>(null);
  useMenuDismiss(open, setOpen, containerRef);
  const signedOut = mode === "signed-out";
  return (
    <header ref={containerRef} className="bg-navy text-cream" data-mode={mode}>
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 md:flex md:gap-6">
        <Link
          to="/"
          aria-label="What the Plate? home"
          className={`shrink-0 rounded-md ${headerFocus}`}
        >
          <img
            src="/brand/what-the-plate-logo-v1.webp"
            alt=""
            width={480}
            height={240}
            className="h-14 w-auto"
          />
        </Link>
        <nav aria-label="Main" className="hidden flex-1 items-center gap-6 md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className={`site-nav-link ${headerFocus}`}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-4 md:flex">
          {signedOut ? (
            <>
              <Link to="/sign-in" search={{ returnTo: "/" }} className={signIn}>
                Sign in
              </Link>
              {demoEnabled && (
                <Link to="/demo" className={tryDemo}>
                  Try the Demo
                </Link>
              )}
            </>
          ) : (
            <MemberProfile showHandle />
          )}
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-2 md:hidden">
          {signedOut ? (
            <Link to="/sign-in" search={{ returnTo: "/" }} className={signIn}>
              Sign in
            </Link>
          ) : (
            <MemberProfile showHandle={false} />
          )}
          <Button
            variant="ghost"
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg p-0 text-cream ${headerFocus}`}
          >
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
          </Button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="border-t border-cream/20 px-4 pb-4 md:hidden"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setOpen(false)}
              className={`site-nav-link block py-3 ${headerFocus}`}
            >
              {item.label}
            </Link>
          ))}
          {signedOut && demoEnabled && (
            <Link
              to="/demo"
              onClick={() => setOpen(false)}
              className={`${tryDemo} mt-2 inline-block`}
            >
              Try the Demo
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
