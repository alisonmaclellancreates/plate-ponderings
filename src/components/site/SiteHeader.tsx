import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, UserRound, X } from "lucide-react";
import { CURRENT_USER } from "@/lib/mock-data";
import type { HeaderMode } from "@/lib/header-mode";
import { useAccountAuth } from "@/lib/account-auth";
import { Button } from "@/components/ui/button";

// Explore, Spot a Plate and About are built in later steps; plain anchors until then.
const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/spot", label: "Spot a Plate" },
  { href: "/about", label: "About" },
];

function Avatar({
  showHandle,
  handle = CURRENT_USER.handle,
}: {
  showHandle: boolean;
  handle?: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-navy">
        <UserRound aria-hidden className="size-5" />
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

/** Demo profile menu, shown open in the preview so Exit Demo is visible. */
function DemoProfile({ showHandle }: { showHandle: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={showHandle ? "profile-menu" : "profile-menu-mobile"}
        aria-label={showHandle ? undefined : `${CURRENT_USER.handle} menu`}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full"
      >
        <Avatar showHandle={showHandle} />
      </button>
      {open && (
        <ul
          id={showHandle ? "profile-menu" : "profile-menu-mobile"}
          aria-label="Profile"
          className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-border bg-card py-1 text-navy shadow-lg"
        >
          <li>
            <Link to="/submissions" className="block px-4 py-2 hover:bg-cream">
              Your Submissions
            </Link>
          </li>
          <li>
            <Link to="/profile" className="block px-4 py-2 hover:bg-cream">
              Your Profile
            </Link>
          </li>
          <li className="border-t border-border">
            <Link to="/" className="block px-4 py-2 font-semibold hover:bg-cream">
              Exit Demo
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}

const signIn = "site-nav-link rounded-md px-2 py-1";
const tryDemo = "rounded-lg border-2 border-cream px-3 py-1.5 font-semibold text-cream";

export function MemberProfile({ showHandle }: { showHandle: boolean }) {
  const auth = useAccountAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  if (!auth?.account) return null;
  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="h-auto rounded-full p-0 text-cream"
        aria-label={`${auth.account.handle} menu`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar showHandle={showHandle} handle={auth.account.handle} />
      </Button>
      {open && (
        <ul
          aria-label="Profile"
          className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-border bg-card py-1 text-navy shadow-lg"
        >
          <li>
            <Link to="/submissions" className="block px-4 py-2 hover:bg-cream">
              Your Submissions
            </Link>
          </li>
          <li>
            <Link to="/profile" className="block px-4 py-2 hover:bg-cream">
              Your Profile
            </Link>
          </li>
          {auth.account.isAdmin && (
            <li>
              <Link to="/admin" className="block px-4 py-2 hover:bg-cream">
                Admin
              </Link>
            </li>
          )}
          <li className="border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start px-4 text-navy"
              onClick={() =>
                void auth.signOut().catch(() => setError("We couldn't sign you out. Try again."))
              }
            >
              Sign out
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
export function SiteHeader({ mode: previewMode }: { mode?: HeaderMode }) {
  const auth = useAccountAuth();
  const mode = previewMode ?? (auth?.account ? "member" : "signed-out");
  const demoEnabled = previewMode !== undefined || auth?.demoEnabled;
  const [open, setOpen] = useState(false);
  const signedOut = mode === "signed-out";
  return (
    <header className="bg-navy text-cream" data-mode={mode}>
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 md:flex md:gap-6">
        <Link to="/" aria-label="What the Plate? home" className="shrink-0 rounded-md">
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
            <a key={item.href} href={item.href} className="site-nav-link">
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
          ) : mode === "demo" ? (
            <DemoProfile showHandle />
          ) : previewMode ? (
            <Avatar showHandle />
          ) : (
            <MemberProfile showHandle />
          )}
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-2 md:hidden">
          {signedOut ? (
            <Link to="/sign-in" search={{ returnTo: "/" }} className={signIn}>
              Sign in
            </Link>
          ) : mode === "demo" ? (
            <DemoProfile showHandle={false} />
          ) : previewMode ? (
            <Avatar showHandle={false} />
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
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg p-0 text-cream"
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
            <a key={item.href} href={item.href} className="site-nav-link block py-3">
              {item.label}
            </a>
          ))}
          {signedOut && demoEnabled && (
            <Link to="/demo" className={`${tryDemo} mt-2 inline-block`}>
              Try the Demo
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
