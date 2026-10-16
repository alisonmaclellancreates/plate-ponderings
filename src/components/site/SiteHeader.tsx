import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, UserRound, X } from "lucide-react";
import { CURRENT_USER } from "@/lib/mock-data";

// Explore, Spot a Plate and About are built in later steps; plain anchors until then.
const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/spot", label: "Spot a Plate" },
  { href: "/about", label: "About" },
];

function Profile({ showHandle }: { showHandle: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="relative inline-flex size-9 items-center justify-center rounded-full bg-cream text-navy">
        <UserRound aria-hidden className="size-5" />
        {CURRENT_USER.hasNotification && (
          <span
            data-testid="notification-dot"
            className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-navy bg-coral"
          />
        )}
      </span>
      <span className={showHandle ? "font-semibold" : "sr-only"}>{CURRENT_USER.handle}</span>
    </span>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-navy text-cream">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-2">
        <Link to="/" aria-label="What the Plate? home" className="shrink-0 rounded-md">
          <img src="/brand/what-the-plate-logo-v1.webp" alt="" width={480} height={240} className="h-14 w-auto" />
        </Link>
        <nav aria-label="Main" className="hidden flex-1 items-center gap-6 md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="site-nav-link">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto hidden md:block">
          <Profile showHandle />
        </div>
        <div className="ml-auto flex items-center gap-3 md:hidden">
          <Profile showHandle={false} />
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-lg"
          >
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="border-t border-cream/20 px-4 pb-4 md:hidden">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="site-nav-link block py-3">
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
