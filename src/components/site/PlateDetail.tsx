import { useState } from "react";
import type React from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Hourglass, MessageCircle, UserCircle2 } from "lucide-react";
import { GuessTeaser, PlateGuessPanel } from "@/components/site/PlateGuessPanel";
import { getPlateGuess } from "@/lib/plate-guesses.functions";
import { PlateFrame } from "@/components/site/PlateFrame";
import { HeartButton, StoryMenuActions } from "@/components/site/StoryActions";
import { ConsensusBadge, HowIKnowBadge, StatusBadge } from "@/components/site/Badges";
import { formatDay } from "@/lib/format-day";
import { StoryPhotoThumbnail, StoryPhotoZoom } from "@/components/site/StoryPhoto";
import { useAccountAuth } from "@/lib/account-auth";
import type { PlateStatus, Summary } from "@/lib/domain";
import { storyCount } from "@/lib/story-count";
import { track } from "@/lib/analytics";
import { CATCHING_UP_MESSAGE, HISTORY_PAGE_SIZE } from "@/lib/summary";
import { getPlateSummary, type PlateSummaryVersion } from "@/lib/summaries.functions";
import { getPlateStories, STORY_PAGE_SIZE, type PlateStory } from "@/lib/stories.functions";
type PanelSummary = Summary & { id?: string };

function EarlierSummaries({ earlier, open }: { earlier: PanelSummary[]; open: boolean }) {
  const [expanded, setExpanded] = useState(open);
  const [limit, setLimit] = useState(HISTORY_PAGE_SIZE);
  const [reading, setReading] = useState<string | null>(null);
  const shown = earlier.slice(0, limit);
  return (
    <div className="mt-4 border-t border-border pt-3">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="earlier-summaries"
        onClick={() => {
          if (!expanded) {
            void track("summary_history_opened", {
              versions_shown: Math.min(limit, earlier.length),
            });
          }
          setExpanded((v) => !v);
        }}
        className="font-semibold text-navy underline underline-offset-4"
      >
        Earlier summaries ({earlier.length})
      </button>
      {expanded && (
        <>
          <ul id="earlier-summaries" className="mt-3 space-y-2">
            {shown.map((s) => {
              const key = s.id ?? s.date;
              const isOpen = reading === key;
              return (
                <li key={key} className="rounded-lg bg-cream p-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <ConsensusBadge consensus={s.consensus} />
                    <span>{storyCount(s.storyCount)}</span>
                    <span className="text-muted-foreground">{formatDay(s.date)}</span>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setReading(isOpen ? null : key)}
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
          {earlier.length > limit && (
            <button
              type="button"
              onClick={() => setLimit((n) => n + HISTORY_PAGE_SIZE)}
              className="mt-3 font-semibold text-navy underline underline-offset-4"
            >
              Show more history
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** The summary panel: newest visible version, catching-up note, and earlier visible versions. */
function SummaryPanel({
  current,
  earlier,
  historyOpen,
  catchingUp,
}: {
  current: PanelSummary | undefined;
  earlier: PanelSummary[];
  historyOpen: boolean;
  catchingUp: boolean;
}) {
  return (
    <section aria-labelledby="story-so-far" className="brand-card p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="story-so-far" className="font-display text-3xl text-navy">
          The Story So Far
        </h2>
        {current && <ConsensusBadge consensus={current.consensus} />}
      </div>
      {current && (
        <p className="mt-1 text-sm text-muted-foreground">
          AI-generated summary · Based on {storyCount(current.storyCount)} · Updated{" "}
          {formatDay(current.date)}
        </p>
      )}
      {catchingUp && (
        <p role="status" className="mt-3 rounded-lg bg-cream-warm px-3 py-2 text-sm">
          {CATCHING_UP_MESSAGE}
        </p>
      )}
      {current && <p className="mt-3 text-lg">{current.text}</p>}
      {current && earlier.length > 0 && <EarlierSummaries earlier={earlier} open={historyOpen} />}
    </section>
  );
}

function RealStorySoFar({
  plateId,
  fallback,
  hiddenGuess = false,
}: {
  plateId: string;
  fallback: React.ReactNode;
  hiddenGuess?: boolean;
}) {
  const { data } = useQuery({
    queryKey: ["plate-summary", plateId],
    queryFn: () => getPlateSummary({ data: { plateId } }),
  });
  const toPanel = (v: PlateSummaryVersion): PanelSummary => ({
    id: String(v.version),
    date: v.generatedAt.slice(0, 10),
    consensus: v.consensus,
    storyCount: v.storyCount,
    text: v.text,
  });
  if (hiddenGuess || !data || (!data.current && !data.catchingUp)) return <>{fallback}</>;
  return (
    <SummaryPanel
      current={data.current ? toPanel(data.current) : undefined}
      earlier={data.earlier.map(toPanel)}
      historyOpen={false}
      catchingUp={data.catchingUp}
    />
  );
}

/** Signed in, straight to the story form; signed out, to the sign-in prompt for this plate. */
function AddStoryLink({
  plateId,
  signedIn,
  className,
}: {
  plateId: string;
  signedIn: boolean;
  className: string;
}) {
  return signedIn ? (
    <Link
      to="/story/$step"
      params={{ step: "1" }}
      search={{ plate: plateId }}
      className={className}
    >
      Add Your Story
    </Link>
  ) : (
    <Link to="/sign-in-prompt" search={{ plate: plateId }} className={className}>
      Add Your Story
    </Link>
  );
}

function MysteryPrompt({
  signedIn,
  plateId,
  storyCount = 0,
  hasGuess = false,
}: {
  signedIn?: boolean;
  plateId?: string;
  storyCount?: number;
  hasGuess?: boolean;
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
        {plateId ? (
          <AddStoryLink
            plateId={plateId}
            signedIn={signedIn === true}
            className="brand-btn brand-btn-coral mt-4 inline-block"
          />
        ) : (
          <button type="button" className="brand-btn brand-btn-coral mt-4">
            Add Your Story
          </button>
        )}
        {hasGuess && <GuessTeaser />}
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

function RealStoryCard({ story, plateId }: { story: PlateStory; plateId: string }) {
  const owner = story.source === "owner";
  const zoom = Boolean(story.photo && story.photoBox);
  return (
    <article
      data-owner={owner || undefined}
      className={`brand-card relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] ${owner ? "border-coral" : ""}`}
    >
      <UserCircle2 aria-hidden className="size-10 shrink-0 text-muted-foreground" />
      <div className={`min-w-0 flex-1 ${zoom ? "sm:min-h-32 sm:pr-44" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm">
            <span className="font-semibold">{story.handle}</span>
            {owner && (
              <span className="ml-2 rounded-full bg-coral-pale px-2 py-0.5 text-xs font-semibold text-navy">
                Owner claim
              </span>
            )}
          </p>
          <StoryMenuActions story={story} plateId={plateId} />
        </div>
        <h3 className="mt-1 text-lg font-bold text-navy">{story.meaning}</h3>
        <div className="mt-2">
          <HowIKnowBadge how={story.source} />
        </div>
        {story.body && <p className="mt-2">{story.body}</p>}
        {story.photo && story.photoBox && (
          <StoryPhotoZoom
            photo={story.photo}
            box={story.photoBox}
            handle={story.handle}
            meaning={story.meaning}
          />
        )}
        <HeartButton story={story} plateId={plateId} />
      </div>
      {story.photo && !zoom && <StoryPhotoThumbnail photo={story.photo} handle={story.handle} />}
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
        <AddStoryLink plateId={plateId} signedIn={signedIn} className="brand-btn brand-btn-coral" />
      </div>
      {data.pending.length > 0 && <PendingPanel />}
      <ul className="space-y-4">
        {data.stories.slice(0, shown).map((s) => (
          <li key={s.id}>
            <RealStoryCard story={s} plateId={plateId} />
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
  from,
}: {
  plate: { id: string; jurisdiction: string; text: string };
  backToSearch?: { jurisdiction: string; text: string } | undefined;
  from?: "submissions" | undefined;
}) {
  const signedIn = Boolean(useAccountAuth()?.account);
  const { data: storiesData } = useQuery({
    queryKey: ["plate-stories", plate.id],
    queryFn: () => getPlateStories({ data: { plateId: plate.id } }),
  });
  const { data: guess } = useQuery({
    queryKey: ["plate-guess", plate.id],
    queryFn: () => getPlateGuess({ data: { plateId: plate.id } }),
  });
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
      ) : from === "submissions" ? (
        <Link
          to="/submissions"
          className="inline-flex items-center gap-1 font-semibold text-navy underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to Your Submissions
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
          <RealStorySoFar
            plateId={plate.id}
            hiddenGuess={guess?.status === "hidden"}
            fallback={
              <MysteryPrompt
                signedIn={signedIn}
                plateId={plate.id}
                storyCount={storiesData?.storyCount ?? 0}
                hasGuess={guess?.status === "hidden"}
              />
            }
          />
          {guess?.status === "revealed" && (
            <div className="mt-6">
              <PlateGuessPanel plateId={plate.id} meaning={guess.meaning} story={guess.story} />
            </div>
          )}
        </div>
      </div>
      <RealStatusStrip plateId={plate.id} />
      <RealStories plateId={plate.id} signedIn={signedIn} />
    </main>
  );
}
