import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Heart,
  Hourglass,
  MessageCircle,
  MoreHorizontal,
  UserCircle2,
} from "lucide-react";
import { PlateFrame } from "@/components/site/PlateFrame";
import { ConsensusBadge, HowIKnowBadge, StatusBadge } from "@/components/site/Badges";
import { formatDay } from "@/lib/format-day";
import { supabase } from "@/integrations/supabase/client";
import {
  CATCHING_UP_STORY,
  PLATES,
  PNW_LV_SUMMARY,
  plateStatus,
  publishedStories,
  type PlateRecord,
  type PlateStatus,
  type Story,
  type Summary,
} from "@/lib/mock-data";
import { storyCount } from "@/lib/story-count";
import { getPlateStories, STORY_PAGE_SIZE, type PlateStory } from "@/lib/stories.functions";
import {
  PAGE_SIZE,
  PLATE_DETAIL_STATES,
  orderStories,
  type PlateDetailState,
} from "@/lib/plate-detail";

function StatusStrip({ plate }: { plate: PlateRecord }) {
  const owner = plate.stories.find((s) => s.howIKnow === "owner");
  return (
    <ul
      aria-label="Plate status"
      className="flex flex-wrap items-center gap-y-2 divide-x divide-border rounded-xl border border-border bg-card py-3"
    >
      <li className="flex items-center gap-2 px-4 font-semibold">
        <MessageCircle aria-hidden className="size-5" />
        {storyCount(plate.stories.length)}
      </li>
      <li className="px-4">
        <StatusBadge status={plateStatus(plate)} />
      </li>
      <li className="px-4 font-semibold">
        {owner ? `Says it's their plate: ${owner.handle}` : "No owner claim yet"}
      </li>
    </ul>
  );
}

function EarlierSummaries({ earlier, open }: { earlier: Summary[]; open: boolean }) {
  const [expanded, setExpanded] = useState(open);
  const [reading, setReading] = useState<string | null>(null);
  return (
    <div className="mt-4 border-t border-border pt-3">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="earlier-summaries"
        onClick={() => setExpanded((v) => !v)}
        className="font-semibold text-navy underline underline-offset-4"
      >
        Earlier summaries ({earlier.length})
      </button>
      {expanded && (
        <ul id="earlier-summaries" className="mt-3 space-y-2">
          {earlier.map((s) => {
            const isOpen = reading === s.date;
            return (
              <li key={s.date} className="rounded-lg bg-cream p-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <ConsensusBadge consensus={s.consensus} />
                  <span>{storyCount(s.storyCount)}</span>
                  <span className="text-muted-foreground">{formatDay(s.date)}</span>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setReading(isOpen ? null : s.date)}
                    className="ml-auto font-semibold text-navy underline underline-offset-4"
                  >
                    Read summary
                  </button>
                </div>
                {isOpen && <p className="mt-2">{s.text}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StorySoFar({
  plate,
  historyOpen,
  catchingUp,
}: {
  plate: PlateRecord;
  historyOpen: boolean;
  catchingUp: boolean;
}) {
  const [current, ...earlier] = plate.summaries;
  if (!current) return null;
  return (
    <section aria-labelledby="story-so-far" className="brand-card p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="story-so-far" className="font-display text-3xl text-navy">
          The Story So Far
        </h2>
        <ConsensusBadge consensus={current.consensus} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        AI-generated summary · Based on {storyCount(current.storyCount)} · Updated{" "}
        {formatDay(current.date)}
      </p>
      {catchingUp && (
        <p role="status" className="mt-3 rounded-lg bg-cream-warm px-3 py-2 text-sm">
          New stories have arrived. The Story So Far is catching up.
        </p>
      )}
      <p className="mt-3 text-lg">{current.text}</p>
      {earlier.length > 0 && <EarlierSummaries earlier={earlier} open={historyOpen} />}
    </section>
  );
}

function MysteryPrompt({
  signedIn,
  plateId,
  storyCount = 0,
}: {
  signedIn?: boolean;
  plateId?: string;
  storyCount?: number;
} = {}) {
  return (
    <section aria-labelledby="first-story" className="space-y-6">
      <div className="rounded-2xl border border-border bg-cream p-6 text-center">
        <h2 id="first-story" className="font-display text-3xl text-navy">
          What do you think this plate means?
        </h2>
        <p className="mt-2 text-lg">
          {storyCount === 0
            ? "Every story starts somewhere. Be the first to share yours!"
            : "Have another interpretation? Add your story."}
        </p>
        {signedIn && plateId ? (
          <Link
            to="/story/$step"
            params={{ step: "1" }}
            search={{ plate: plateId }}
            className="brand-btn brand-btn-coral mt-4 inline-block"
          >
            Add Your Story
          </Link>
        ) : (
          <button type="button" className="brand-btn brand-btn-coral mt-4">
            Add Your Story
          </button>
        )}
      </div>
      <div
        data-testid="roadside-sign"
        className="mx-auto max-w-xs rounded-lg border-4 border-teal bg-card p-4 text-center font-display text-xl text-teal"
      >
        Different roads. Different stories. What's yours?
      </div>
    </section>
  );
}

export function StoryCard({ story }: { story: Story }) {
  const owner = story.howIKnow === "owner";
  return (
    <article
      data-owner={owner || undefined}
      className={`brand-card grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] ${owner ? "border-coral" : ""}`}
    >
      <UserCircle2 aria-hidden className="size-10 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm">
            <span className="font-semibold">{story.handle}</span>{" "}
            <span className="text-muted-foreground">· {formatDay(story.date)}</span>
            {owner && (
              <span className="ml-2 rounded-full bg-coral-pale px-2 py-0.5 text-xs font-semibold text-navy">
                Owner claim
              </span>
            )}
          </p>
          <button
            type="button"
            aria-label={`More options for ${story.handle}'s story`}
            className="text-muted-foreground"
          >
            <MoreHorizontal aria-hidden className="size-5" />
          </button>
        </div>
        <h3 className="mt-1 text-lg font-bold text-navy">{story.meaning}</h3>
        <div className="mt-2">
          <HowIKnowBadge how={story.howIKnow} />
        </div>
        {story.longer && <p className="mt-2">{story.longer}</p>}
        <p className="mt-2 flex items-center gap-1 text-sm">
          <Heart aria-hidden className="size-4 text-coral" />
          <span>{story.hearts}</span>
          <span className="sr-only">{story.hearts === 1 ? "heart" : "hearts"}</span>
        </p>
      </div>
      {story.photo && (
        <img
          src={story.photo}
          alt={`Photo shared by ${story.handle}`}
          width={944}
          height={704}
          loading="lazy"
          className="col-start-2 h-20 w-28 shrink-0 rounded-md object-cover sm:col-start-auto"
        />
      )}
    </article>
  );
}

function PendingPanel() {
  return (
    <div role="status" className="flex gap-3 rounded-xl bg-slate p-4">
      <Hourglass aria-hidden className="size-5 shrink-0 text-navy" />
      <p>
        <span className="font-semibold">Your story is waiting for its check.</span> Only you can see
        this for now.
      </p>
    </div>
  );
}

export function Stories({ stories, pending }: { stories: Story[]; pending: boolean }) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const ordered = orderStories(stories);
  const remaining = ordered.length - shown;
  return (
    <section aria-labelledby="stories-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="stories-heading" className="font-display text-3xl text-navy">
          Stories
        </h2>
        <button type="button" className="brand-btn brand-btn-coral">
          Add Your Story
        </button>
      </div>
      {pending && <PendingPanel />}
      <ul className="space-y-4">
        {ordered.slice(0, shown).map((s) => (
          <li key={s.id}>
            <StoryCard story={s} />
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE_SIZE)}
          className="font-semibold text-navy underline underline-offset-4"
        >
          Show {Math.min(PAGE_SIZE, remaining)} more {remaining === 1 ? "story" : "stories"}
        </button>
      )}
    </section>
  );
}

export function PlateDetail({ state }: { state: string }) {
  const slug = Object.hasOwn(PLATE_DETAIL_STATES, state)
    ? PLATE_DETAIL_STATES[state as PlateDetailState].slug
    : state;
  const record = PLATES.find((p) => p.slug === slug);
  const basePlate = record ? { ...record, stories: publishedStories(record) } : undefined;
  if (!basePlate) return null;
  const plate =
    state === "catching-up"
      ? { ...basePlate, stories: [...basePlate.stories, CATCHING_UP_STORY] }
      : slug === "or-pnwlv"
        ? { ...basePlate, summaries: [PNW_LV_SUMMARY] }
        : basePlate;
  const hasStories = plate.stories.length > 0;
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <a
        href="/explore"
        className="inline-flex items-center gap-1 font-semibold text-navy underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to Explore
      </a>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[auto_minmax(0,1fr)]">
        <PlateFrame jurisdiction={plate.jurisdiction} text={plate.text} />
        <div className="min-w-0">
          {hasStories ? (
            <StorySoFar
              plate={plate}
              historyOpen={state === "interpreted-history"}
              catchingUp={state === "catching-up"}
            />
          ) : (
            <MysteryPrompt />
          )}
        </div>
      </div>
      <StatusStrip plate={plate} />
      {hasStories && <Stories stories={plate.stories} pending={state === "pending-story"} />}
    </main>
  );
}

function RealStoryCard({ story }: { story: PlateStory }) {
  const owner = story.source === "owner";
  return (
    <article
      data-owner={owner || undefined}
      className={`brand-card grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 p-4 ${owner ? "border-coral" : ""}`}
    >
      <UserCircle2 aria-hidden className="size-10 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold">{story.handle}</span>
          {owner && (
            <span className="ml-2 rounded-full bg-coral-pale px-2 py-0.5 text-xs font-semibold text-navy">
              Owner claim
            </span>
          )}
        </p>
        <h3 className="mt-1 text-lg font-bold text-navy">{story.meaning}</h3>
        <div className="mt-2">
          <HowIKnowBadge how={story.source} />
        </div>
        {story.body && <p className="mt-2">{story.body}</p>}
        <p className="mt-2 flex items-center gap-1 text-sm">
          <Heart aria-hidden className="size-4 text-coral" />
          <span>{story.hearts}</span>
          <span className="sr-only">{story.hearts === 1 ? "heart" : "hearts"}</span>
        </p>
      </div>
    </article>
  );
}

function RealStories({ plateId, signedIn }: { plateId: string; signedIn: boolean }) {
  const [shown, setShown] = useState(STORY_PAGE_SIZE);
  const { data } = useQuery({
    queryKey: ["plate-stories", plateId],
    queryFn: () => getPlateStories({ data: { plateId } }),
  });
  if (!data) return null;
  const remaining = data.total - shown;
  return (
    <section aria-labelledby="stories-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="stories-heading" className="font-display text-3xl text-navy">
          Stories
        </h2>
        {signedIn && (
          <Link
            to="/story/$step"
            params={{ step: "1" }}
            search={{ plate: plateId }}
            className="brand-btn brand-btn-coral"
          >
            Add Your Story
          </Link>
        )}
      </div>
      {data.pending.length > 0 && <PendingPanel />}
      <ul className="space-y-4">
        {data.stories.slice(0, shown).map((s) => (
          <li key={s.id}>
            <RealStoryCard story={s} />
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setShown((n) => n + STORY_PAGE_SIZE)}
          className="font-semibold text-navy underline underline-offset-4"
        >
          Show {Math.min(STORY_PAGE_SIZE, remaining)} more {remaining === 1 ? "story" : "stories"}
        </button>
      )}
    </section>
  );
}

function RealStatusStrip({ plateId }: { plateId: string }) {
  const { data } = useQuery({
    queryKey: ["plate-stories", plateId],
    queryFn: () => getPlateStories({ data: { plateId } }),
  });
  const count = data?.storyCount ?? 0;
  const status: PlateStatus = data?.hasOwnerStory ? "owner" : count > 0 ? "interpreted" : "mystery";
  return (
    <ul
      aria-label="Plate status"
      className="flex flex-wrap items-center gap-y-2 divide-x divide-border rounded-xl border border-border bg-card py-3"
    >
      <li className="flex items-center gap-2 px-4 font-semibold">
        <MessageCircle aria-hidden className="size-5" />
        {storyCount(count)}
      </li>
      <li className="px-4">
        <StatusBadge status={status} />
      </li>
      <li className="px-4 font-semibold">
        {data?.ownerHandle ? `Says it's their plate: ${data.ownerHandle}` : "No owner claim yet"}
      </li>
    </ul>
  );
}

/** A real published plate: frame, identity, status strip and stories from live data. */
export function RealPlateDetail({
  plate,
  backToSearch,
}: {
  plate: { id: string; jurisdiction: string; text: string };
  backToSearch?: { jurisdiction: string; text: string } | undefined;
}) {
  const [signedIn, setSignedIn] = useState(false);
  const { data: storiesData } = useQuery({
    queryKey: ["plate-stories", plate.id],
    queryFn: () => getPlateStories({ data: { plateId: plate.id } }),
  });
  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setSignedIn(data.user !== null);
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {backToSearch ? (
        <Link
          to="/"
          search={{ jurisdiction: backToSearch.jurisdiction, text: backToSearch.text }}
          className="inline-flex items-center gap-1 font-semibold text-navy underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to Search
        </Link>
      ) : (
        <a
          href="/explore"
          className="inline-flex items-center gap-1 font-semibold text-navy underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to Explore
        </a>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[auto_minmax(0,1fr)]">
        <PlateFrame jurisdiction={plate.jurisdiction} text={plate.text} />
        <div className="min-w-0">
          <MysteryPrompt
            signedIn={signedIn}
            plateId={plate.id}
            storyCount={storiesData?.storyCount ?? 0}
          />
        </div>
      </div>
      <RealStatusStrip plateId={plate.id} />
      <RealStories plateId={plate.id} signedIn={signedIn} />
    </main>
  );
}
