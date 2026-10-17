import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Star } from "lucide-react";
import { FeaturedPlateCard } from "@/components/site/FeaturedPlateCard";
import { Plate } from "@/components/site/Plate";
import { StatusBadge } from "@/components/site/Badges";
import { JURISDICTION_GROUPS } from "@/lib/jurisdictions";
import { validateSpot, type SpotErrors } from "@/lib/spot";
import { searchPlate } from "@/lib/plates.functions";
import { track } from "@/lib/analytics";
import { openFeatured, previewFeatured, type FeaturedDisplay } from "@/lib/featured";
import type { FeaturedHome } from "@/lib/featured.functions";

import { storyCount } from "@/lib/story-count";
import { HEADLINES, useHeadlineIndex } from "@/lib/headlines";
import { PLATES, featuredPlates, TODAY, type PlateRecord } from "@/lib/mock-data";

function Headline() {
  const active = useHeadlineIndex();
  // All three share one grid cell, so the area is always as tall as the longest headline.
  return (
    <h1 aria-live="polite" className="grid text-5xl text-navy xl:text-6xl">
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

export interface SearchValues {
  jurisdiction?: string | undefined;
  text?: string | undefined;
}

function SearchCard({
  values,
  onNoMatch,
  onSearchError,
}: {
  values: SearchValues;
  onNoMatch: (values: Required<SearchValues>) => void;
  onSearchError: (message: string | null) => void;
}) {
  const [jurisdiction, setJurisdiction] = useState(values.jurisdiction ?? "");
  const [text, setText] = useState(values.text ?? "");
  const [errors, setErrors] = useState<SpotErrors>({});
  const [busy, setBusy] = useState(false);
  const search = useServerFn(searchPlate);
  const navigate = useNavigate();
  const textDescribedBy = ["plate-text-hint", errors.text && "plate-text-error"]
    .filter(Boolean)
    .join(" ");
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const next = validateSpot({ jurisdiction, text });
    setErrors(next);
    if (next.jurisdiction || next.text) return;
    setBusy(true);
    onSearchError(null);
    try {
      const result = await search({ data: { jurisdiction, text } });
      if (result.status === "error") {
        await track("subject_searched", { found: false, jurisdiction });
        onSearchError("We couldn't search right now. Please try again in a few moments.");
        return;
      }
      await track("subject_searched", {
        found: result.status === "found",
        jurisdiction,
      });
      if (result.status === "found") {
        await navigate({
          to: "/plate/$state",
          params: { state: result.plate.id },
          search: { jurisdiction, text },
        });
      } else {
        onNoMatch({ jurisdiction, text });
      }
    } catch {
      onSearchError("We couldn't search right now. Please try again in a few moments.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      id="plate-search"
      role="search"
      aria-label="Look up a plate"
      noValidate
      onSubmit={onSubmit}
      className="brand-card bg-cream p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">State or Province</span>
            <select
              name="jurisdiction"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              aria-invalid={errors.jurisdiction ? true : undefined}
              aria-describedby={errors.jurisdiction ? "plate-jurisdiction-error" : undefined}
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
          {errors.jurisdiction && (
            <p
              id="plate-jurisdiction-error"
              role="alert"
              className="mt-1 flex items-center gap-1 text-sm text-coral-cta"
            >
              <AlertCircle aria-hidden className="size-4 shrink-0" />
              {errors.jurisdiction}
            </p>
          )}
        </div>
        <div>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Plate text</span>
            <input
              name="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. B7K2L9"
              aria-invalid={errors.text ? true : undefined}
              aria-describedby={textDescribedBy}
              className="h-11 w-full rounded-lg border border-input bg-card px-3 uppercase placeholder:normal-case"
            />
          </label>
          <span id="plate-text-hint" className="mt-1 block text-sm text-muted-foreground">
            Spaces and dashes are ignored
          </span>
          {errors.text && (
            <p
              id="plate-text-error"
              role="alert"
              className="mt-1 flex items-center gap-1 text-sm text-coral-cta"
            >
              <AlertCircle aria-hidden className="size-4 shrink-0" />
              {errors.text}
            </p>
          )}
        </div>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="brand-btn brand-btn-navy mt-4 w-full sm:w-auto"
      >
        Search
      </button>
    </form>
  );
}

function NoMatchPanel({ values }: { values: Required<SearchValues> }) {
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
        <Link
          to="/spot"
          search={{ jurisdiction: values.jurisdiction, text: values.text }}
          className="brand-btn brand-btn-coral mt-3"
        >
          Spot a Plate
        </Link>
      </div>
    </section>
  );
}

const INTRO = "Curious about a plate you saw? Look it up, or add a new mystery to the collection.";

function Hero({
  search,
  noMatch,
  onNoMatch,
  searchError,
  onSearchError,
}: {
  search: SearchValues;
  noMatch: Required<SearchValues> | null;
  onNoMatch: (values: Required<SearchValues>) => void;
  searchError: string | null;
  onSearchError: (message: string | null) => void;
}) {
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
            <SearchCard values={search} onNoMatch={onNoMatch} onSearchError={onSearchError} />
            {searchError && (
              <p role="alert" className="mt-4 text-sm font-semibold text-coral-cta">
                {searchError}
              </p>
            )}
            {noMatch && <NoMatchPanel values={noMatch} />}
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

export function PlateOfTheDay({
  plate,
  utcToday,
  headingId = "potd-heading",
}: {
  plate: PlateRecord | FeaturedDisplay;
  utcToday?: string | undefined;
  headingId?: string;
}) {
  const display = "day" in plate ? plate : previewFeatured(plate);
  const status = display.status;
  const n = display.count;
  const copy =
    status === "mystery"
      ? `No stories yet. What do you think ${plate.text} means? Be the first to share your interpretation!`
      : `Only ${storyCount(n)} so far. What do you think ${plate.text} means? Add yours to the conversation!`;
  return (
    <section
      aria-labelledby={headingId}
      className="bg-cover bg-center py-12"
      style={{ backgroundImage: "url(/brand/plate-of-the-day-landscape-v2.webp)" }}
    >
      <div className="mx-auto max-w-5xl px-4">
        <div className="rounded-2xl bg-cream p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-2">
            <Star aria-hidden className="size-6 fill-gold text-gold" />
            <h2 id={headingId} className="font-display text-4xl text-navy">
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
              <Link
                to="/plate/$state"
                params={{ state: plate.slug }}
                onClick={utcToday ? () => openFeatured(display, utcToday) : undefined}
                className="brand-btn brand-btn-navy mt-4"
              >
                View This Plate
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RecentlyFeatured({ live }: { live?: FeaturedHome | undefined }) {
  const recent = live
    ? live.recent
    : featuredPlates()
        .filter((p) => p.plateOfTheDay !== TODAY)
        .slice(0, 4);
  if (recent.length === 0) return null;
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
          <li key={"day" in p ? p.day : p.plateOfTheDay} className="min-w-0">
            <FeaturedPlateCard plate={p} utcToday={live?.today} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export type HomepageVariant = "default" | "no-match" | "fallback";

export function Homepage({
  variant = "default",
  prefill,
  live,
}: {
  variant?: HomepageVariant;
  prefill?: SearchValues;
  live?: FeaturedHome | undefined;
}) {
  const [noMatch, setNoMatch] = useState<Required<SearchValues> | null>(
    variant === "no-match" ? { jurisdiction: "Utah", text: "DRAGON" } : null,
  );
  const [searchError, setSearchError] = useState<string | null>(null);
  const featured = live
    ? live.pick
    : PLATES.find((p) =>
        variant === "fallback" ? p.slug === "co-wander" : p.plateOfTheDay === TODAY,
      );
  const search =
    variant === "no-match" ? { jurisdiction: "Utah", text: "DRAGON" } : (prefill ?? {});
  return (
    <main>
      <Hero
        search={search}
        noMatch={noMatch}
        onNoMatch={setNoMatch}
        searchError={searchError}
        onSearchError={setSearchError}
      />
      <ActionCards />
      <HowItWorks />
      {featured && <PlateOfTheDay plate={featured} utcToday={live?.today} />}
      <RecentlyFeatured live={live} />
      <p className="font-display px-4 pt-4 text-center text-4xl text-navy">
        Different roads. Different stories. What's yours?
      </p>
    </main>
  );
}
