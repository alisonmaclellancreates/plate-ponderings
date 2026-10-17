import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FeaturedPlateCard } from "@/components/site/FeaturedPlateCard";
import { featuredPlates, TODAY } from "@/lib/mock-data";
import type { FeaturedDisplay } from "@/lib/featured";

export function Explore({ live }: { live?: { plates: FeaturedDisplay[]; today: string; hasMore: boolean; busy: boolean; loadMore: () => Promise<unknown> } | undefined }) {
  const [shown, setShown] = useState(12);
  const [focusFrom, setFocusFrom] = useState<number | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const plates = live ? live.plates : featuredPlates();
  useEffect(() => {
    if (focusFrom === null) return;
    list.current?.querySelectorAll("a")[focusFrom]?.focus();
    setFocusFrom(null);
  }, [focusFrom]);
  return (
    <main>
      <section className="relative overflow-hidden">
        <img
          src="/brand/archive-landscape-v1.webp"
          alt=""
          className="h-40 w-full object-cover object-center sm:h-48"
        />
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-8">
          <h1 className="font-display text-4xl text-navy sm:text-5xl">The Roadside Archive</h1>
          <p className="mt-3 max-w-2xl text-lg">
            Every day, a new mystery takes the spotlight. Here's where you can revisit the plates
            we've featured along the way.
          </p>
        </div>
      </section>
      <section aria-label="Featured plates" className="mx-auto max-w-6xl px-4 pb-12">
        <ul
          ref={list}
          id="featured-plates"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {(live ? plates : plates.slice(0, shown)).map((plate) => (
            <li key={"day" in plate ? plate.day : plate.plateOfTheDay} className="min-w-0">
              <FeaturedPlateCard plate={plate} today={"day" in plate ? plate.day === live?.today : plate.plateOfTheDay === TODAY} utcToday={live?.today} />
            </li>
          ))}
        </ul>
        {(live ? live.hasMore : shown < plates.length) && (
          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              className="brand-btn brand-btn-navy"
              aria-controls="featured-plates"
              disabled={live?.busy}
              onClick={async () => {
                if (live) {
                  const from = plates.length;
                  await live.loadMore();
                  setFocusFrom(from);
                } else {
                  setFocusFrom(shown);
                  setShown(shown + 12);
                }
              }}
            >
              Load More
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
