import { useEffect, useState } from "react";
import { MessageCircle, Star } from "lucide-react";
import { Plate } from "@/components/site/Plate";
import { StatusBadge } from "@/components/site/Badges";
import { JURISDICTION_GROUPS } from "@/lib/jurisdictions";
import { PLATES, plateStatus, type PlateRecord } from "@/lib/mock-data";

export const HEADLINES = [
  "Every plate has a story.",
  "Little plates. Big stories.",
  "Spotted a plate? Let's solve it.",
] as const;

export const ROTATE_MS = 9000;

/**
 * Desktop: soft rotation every 9s, held on the first headline for reduced motion.
 * Mobile: one random headline per visit, no rotation. Starts at 0 so SSR and hydration match.
 */
export function useHeadlineIndex(): number {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 1023px)").matches;
    if (mobile) {
      setIndex(Math.floor(Math.random() * HEADLINES.length));
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % HEADLINES.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);
  return index;
}

function Headline() {
  const active = useHeadlineIndex();
  // All three share one grid cell, so the area is always as tall as the longest headline.
  return (
    <h1 className="grid text-5xl text-navy xl:text-6xl">
      {HEADLINES.map((text, i) => (
        <span
          key={text}
          aria-hidden={i !== active}
          className={`headline-slide font-display col-start-1 row-start-1 ${i === active ? "opacity-100" : "opacity-0"}`}
        >
          {text}
        </span>
      ))}
    </h1>
  );
}

interface SearchValues {
  jurisdiction?: string;
  text?: string;
}

function SearchCard({ values }: { values: SearchValues }) {
  return (
    <form
      id="plate-search"
      role="search"
      aria-label="Look up a plate"
      onSubmit={(e) => e.preventDefault()}
      className="brand-card bg-cream p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">State or Province</span>
          <select
            name="jurisdiction"
            defaultValue={values.jurisdiction ?? ""}
            className="h-11 w-full rounded-lg border border-input bg-card px-3"
          >
            <option value="" disabled>
              Select a state or province
            </option>
            {JURISDICTION_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.names.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Plate text</span>
            <input
              name="text"
              defaultValue={values.text ?? ""}
              placeholder="e.g. B7K2L9"
              aria-describedby="plate-text-hint"
              className="h-11 w-full rounded-lg border border-input bg-card px-3 uppercase placeholder:normal-case"
            />
          </label>
          <span id="plate-text-hint" className="mt-1 block text-sm text-muted-foreground">
            Spaces and dashes are ignored
          </span>
        </div>
      </div>
      <button type="submit" className="brand-btn brand-btn-navy mt-4 w-full sm:w-auto">
        Search
      </button>
    </form>
  );
}

function NoMatchPanel() {
  return (
    <section
      aria-labelledby="no-match-heading"
      className="brand-card mt-4 flex flex-col items-center gap-4 bg-cream p-5 text-center sm:flex-row sm:text-left"
    >
      <img src="/brand/search-no-match-v1.webp" alt="" width={700} height={467} className="w-40" />
      <div>
        <h2 id="no-match-heading" className="font-display text-xl text-navy">
          No plate found. Yet!
        </h2>
        <p className="mt-1">We couldn't find this plate in the collection. Want to add it?</p>
        <a href="/spot" className="brand-btn brand-btn-coral mt-3">
          Spot a Plate
        </a>
      </div>
    </section>
  );
}

const INTRO = "Curious about a plate you saw? Look it up, or add a new mystery to the collection.";

function Hero({ search, noMatch }: { search: SearchValues; noMatch: boolean }) {
  return (
    <section aria-label="Welcome" className="grid">
      <img
        src="/brand/homepage-hero-v2.webp"
        alt="An illustrated vintage car on a scenic road"
        width={1600}
        height={800}
        className="col-start-1 row-start-1 block h-auto w-full"
      />
      {/* Rendered once. Desktop: overlays the quiet left half, washed only behind itself.
          Mobile and tablet: stacks under the illustration. */}
      <div className="row-start-2 px-4 py-8 sm:px-8 lg:hero-text-wash lg:col-start-1 lg:row-start-1 lg:flex lg:w-[52%] lg:items-center lg:py-8 lg:pr-16 lg:pl-10 xl:pl-16">
        <div className="w-full">
          <Headline />
          <p className="mt-3 max-w-md text-lg">{INTRO}</p>
          <div className="mt-6">
            <SearchCard values={search} />
            {noMatch && <NoMatchPanel />}
          </div>
        </div>
      </div>
    </section>
  );
}

function ActionCards() {
  function focusSearch() {
    const searchCard = document.getElementById("plate-search");
    const jurisdiction = searchCard?.querySelector<HTMLSelectElement>(
      'select[name="jurisdiction"]',
    );
    if (!searchCard || !jurisdiction) return;
    searchCard.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
    });
    jurisdiction.focus({ preventScroll: true });
  }

  return (
    <section
      aria-label="Get started"
      className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-2"
    >
      <article className="brand-card flex flex-col border-teal bg-cream p-6">
        <img
          src="/brand/look-up-a-plate-v1.webp"
          alt=""
          width={700}
          height={467}
          className="mx-auto w-56"
        />
        <h2 className="font-display mt-4 text-2xl text-navy">Look Up a Plate</h2>
        <p className="mt-2 flex-1">
          See what people think it means, or add your own interpretation.
        </p>
        <button
          type="button"
          onClick={focusSearch}
          className="brand-btn brand-btn-navy mt-4 self-start"
        >
          Look Up a Plate
        </button>
      </article>
      <article className="brand-card flex flex-col bg-cream-warm p-6">
        <img
          src="/brand/spot-a-plate-v1.webp"
          alt=""
          width={700}
          height={467}
          className="mx-auto w-56"
        />
        <h2 className="font-display mt-4 text-2xl text-navy">Spot a Plate</h2>
        <p className="mt-2 flex-1">
          Spotted a clever plate? Have one of your own? Add it to the collection and let the
          guessing begin!
        </p>
        <a href="/spot" className="brand-btn brand-btn-coral mt-4 self-start">
          Spot a Plate
        </a>
      </article>
    </section>
  );
}

const STEPS = [
  { img: "plate", name: "Spot a plate.", line: "Add any clever plate you've seen, or your own." },
  { img: "story", name: "Share what you think.", line: "Tell its story, or make your best guess." },
  {
    img: "lookup",
    name: "See the story so far.",
    line: "An AI summary shows where people agree and where they don't.",
  },
] as const;

function HowItWorks() {
  return (
    <section
      aria-labelledby="how-heading"
      className="bg-cover bg-bottom py-12"
      style={{ backgroundImage: "url(/brand/how-it-works-landscape-v2.webp)" }}
    >
      <div className="mx-auto max-w-6xl px-4">
        <h2
          id="how-heading"
          className="font-display mx-auto w-fit rounded-xl bg-cream px-6 py-2 text-5xl text-navy"
        >
          How it works
        </h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.img} className="flex flex-col items-center text-center">
              <img
                src={`/brand/how-it-works-signpost-${step.img}-v1.webp`}
                alt=""
                width={700}
                height={780}
                loading="lazy"
                className="h-40 w-auto"
              />
              <div className="mt-3 rounded-xl bg-cream px-4 py-3">
                <p className="font-bold text-navy">
                  {i + 1}. {step.name}
                </p>
                <p className="mt-1">{step.line}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function storyCount(n: number) {
  return `${n} ${n === 1 ? "story" : "stories"}`;
}

export function PlateOfTheDay({ plate }: { plate: PlateRecord }) {
  const status = plateStatus(plate);
  const n = plate.stories.length;
  const copy =
    status === "mystery"
      ? `No stories yet. What do you think ${plate.text} means? Be the first to share your interpretation!`
      : `Only ${storyCount(n)} so far. What do you think ${plate.text} means? Add yours to the conversation!`;
  return (
    <section
      aria-labelledby="potd-heading"
      className="bg-cover bg-center py-12"
      style={{ backgroundImage: "url(/brand/plate-of-the-day-landscape-v2.webp)" }}
    >
      <div className="mx-auto max-w-5xl px-4">
        <div className="rounded-2xl bg-cream p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-2">
            <Star aria-hidden className="size-6 fill-gold text-gold" />
            <h2 id="potd-heading" className="font-display text-4xl text-navy">
              Plate of the Day
            </h2>
          </div>
          <p className="mt-1 text-muted-foreground">Today's pick from the road.</p>
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-center gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
            <Plate
              jurisdiction={plate.jurisdiction}
              text={plate.text}
              size="lg"
              className="min-w-0"
            />
            <div className="min-w-0">
              <StatusBadge status={status} />
              <p className="mt-3 text-lg">{copy}</p>
              <a href="/plate/mystery" className="brand-btn brand-btn-navy mt-4">
                View This Plate
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats an ISO day without Date, so server and browser time zones always agree. */
export function formatDay(iso: string) {
  const [y, m = 1, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

const TODAY = "2026-10-16";

function RecentlyFeatured() {
  const recent = PLATES.filter((p) => p.plateOfTheDay && p.plateOfTheDay < TODAY)
    .sort((a, b) => b.plateOfTheDay!.localeCompare(a.plateOfTheDay!))
    .slice(0, 4);
  return (
    <section aria-labelledby="recent-heading" className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="recent-heading" className="font-display text-3xl text-navy">
            Recently Featured
          </h2>
          <p className="text-muted-foreground">From past Plates of the Day.</p>
        </div>
        <a href="/explore" className="font-semibold text-navy underline underline-offset-4">
          View All Featured Plates
        </a>
      </div>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {recent.map((p) => (
          <li key={p.slug} className="brand-card flex flex-col items-center gap-3 p-4 text-center">
            <Plate jurisdiction={p.jurisdiction} text={p.text} size="md" />
            <p className="text-sm text-muted-foreground">Featured {formatDay(p.plateOfTheDay!)}</p>
            <p className="flex items-center gap-1 font-semibold">
              <MessageCircle aria-hidden className="size-4" />
              {storyCount(p.stories.length)}
            </p>
            <StatusBadge status={plateStatus(p)} />
            <p className="text-sm">Was a mystery, now {storyCount(p.stories.length)}.</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export type HomepageVariant = "default" | "no-match" | "fallback";

export function Homepage({ variant = "default" }: { variant?: HomepageVariant }) {
  const featured = PLATES.find((p) =>
    variant === "fallback" ? p.slug === "co-wander" : p.plateOfTheDay === TODAY,
  )!;
  const search = variant === "no-match" ? { jurisdiction: "Utah", text: "DRAGON" } : {};
  return (
    <main>
      <Hero search={search} noMatch={variant === "no-match"} />
      <ActionCards />
      <HowItWorks />
      <PlateOfTheDay plate={featured} />
      <RecentlyFeatured />
      <p className="font-display px-4 pt-4 text-center text-4xl text-navy">
        Different roads. Different stories. What's yours?
      </p>
    </main>
  );
}
