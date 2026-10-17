import { createFileRoute } from "@tanstack/react-router";
import { PlateOfTheDay, RecentlyFeatured } from "@/components/site/Homepage";
import { featuredPlates, publishedStories } from "@/lib/mock-data";

export const Route = createFileRoute("/previews_/homepage-featured")({
  head: () => ({
    meta: [
      { title: "Homepage featured samples | What the Plate?" },
      {
        name: "description",
        content:
          "Sample mystery and fallback daily bands, with singular and plural stories and a four-card shelf.",
      },
      { property: "og:title", content: "Homepage featured samples | What the Plate?" },
      {
        property: "og:description",
        content:
          "Sample mystery and fallback daily bands, with singular and plural stories and a four-card shelf.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomepageFeaturedPreview,
});

const SAMPLE_BANDS = [
  { count: 0, label: "Mystery" },
  { count: 1, label: "Fallback, singular" },
  { count: 2, label: "Fallback, plural" },
] as const;

function HomepageFeaturedPreview() {
  const plates = featuredPlates();
  return (
    <main>
      <h1 className="mx-auto max-w-6xl px-4 py-8 font-display text-4xl text-navy">
        Homepage featured samples
      </h1>
      {SAMPLE_BANDS.map(({ count, label }) =>
        plates
          .filter((sample) => publishedStories(sample).length === count)
          .slice(0, 1)
          .map((plate) => (
            <section key={count} aria-label={label}>
              <h2 className="mx-auto max-w-6xl px-4 py-6 font-display text-2xl text-navy">
                {label}
              </h2>
              <PlateOfTheDay plate={plate} headingId={`sample-potd-${count}`} />
            </section>
          )),
      )}
      <RecentlyFeatured />
    </main>
  );
}
