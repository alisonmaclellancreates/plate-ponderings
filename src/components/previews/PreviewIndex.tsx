import { Link } from "@tanstack/react-router";
import { LIVE_PAGES, PREVIEWS, PREVIEW_GROUPS } from "@/lib/preview-registry";

const card = "brand-card block h-full p-4 transition-shadow hover:shadow-md";

/** The gallery index: sample screens by group, then the live pages to check alongside them. */
export function PreviewIndex() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-4xl text-navy">Previews</h1>
      <p className="mt-2 max-w-2xl text-lg">
        Sample screens built from the real pages and made-up plates. Nothing in them reads or
        changes the collection.
      </p>
      {PREVIEW_GROUPS.map((group) => {
        const id = `group-${group.toLowerCase().replace(/[^a-z]+/g, "-")}`;
        return (
          <section key={group} aria-labelledby={id} className="mt-10">
            <h2 id={id} className="font-display text-2xl text-navy">
              {group}
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PREVIEWS.filter((p) => p.group === group).map((p) => (
                <li key={p.slug}>
                  <Link to="/previews/$screen" params={{ screen: p.slug }} className={card}>
                    <span className="font-semibold text-navy">{p.label}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{p.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <section aria-labelledby="group-live" className="mt-10">
        <h2 id="group-live" className="font-display text-2xl text-navy">
          Live pages
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">These show the real collection.</p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LIVE_PAGES.map((p) => (
            <li key={p.to}>
              <Link to={p.to} className={card}>
                <span className="font-semibold text-navy">{p.label}</span>
                <span className="mt-1 block text-sm text-muted-foreground">Live</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
