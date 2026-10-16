import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "What the Plate?" },
      { name: "description", content: "Preview index for What the Plate? static screens." },
      { property: "og:title", content: "What the Plate?" },
      { property: "og:description", content: "Preview index for What the Plate? static screens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

/** Every static preview route. Add one entry per new preview page. */
const PREVIEWS = [
  { to: "/preview/components", label: "Plate and badges", note: "Plate in three sizes, every badge" },
] as const;

function Index() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl text-navy">What the Plate?</h1>
      <p className="mt-2 text-lg">Static page previews. Mock data only.</p>
      <ul className="mt-8 space-y-3">
        {PREVIEWS.map((p) => (
          <li key={p.to}>
            <Link to={p.to} className="brand-card block p-4 hover:shadow-md">
              <span className="font-semibold text-navy">{p.label}</span>
              <span className="block text-sm text-muted-foreground">{p.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
