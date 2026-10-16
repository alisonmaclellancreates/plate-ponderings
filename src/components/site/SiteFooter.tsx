// About, Privacy and Contact are built in a later step; plain anchors until then.
const LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16">
      <div className="relative">
        <img
          src="/brand/footer-landscape-v2.webp"
          alt=""
          loading="lazy"
          width={1600}
          height={533}
          className="block h-40 w-full object-cover object-bottom sm:h-auto"
        />
        <div className="absolute inset-x-0 top-[8%] flex justify-center px-4">
          <div className="relative w-64 sm:w-96">
            <img src="/brand/tagline-sign-v1.webp" alt="" loading="lazy" width={1200} height={400} className="w-full" />
            <p className="font-display absolute inset-0 flex items-center justify-center pb-[6%] text-lg text-navy sm:text-2xl">
              Little plates. Big stories.
            </p>
          </div>
        </div>
      </div>
      <div className="bg-navy text-cream">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between">
          <img src="/brand/footer-pines-emblem-v2.webp" alt="" loading="lazy" width={256} height={237} className="h-14 w-auto" />
          <nav aria-label="Footer">
            <ul className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="site-nav-link">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-sm">© 2026 Alison MacLellan. Built for #SheBuilds.</p>
        </div>
      </div>
    </footer>
  );
}
