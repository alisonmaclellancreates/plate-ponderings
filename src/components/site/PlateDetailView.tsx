import { useState, type ComponentType, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Hourglass, MessageCircle, UserCircle2 } from "lucide-react";
import { GuessTeaser, PlateGuessPanel } from "@/components/site/PlateGuessPanel";
import { PlateFrame } from "@/components/site/PlateFrame";
import { ConsensusBadge, HowIKnowBadge, StatusBadge } from "@/components/site/Badges";
import { StoryPhotoThumbnail, StoryPhotoZoom } from "@/components/site/StoryPhoto";
import { formatDay } from "@/lib/format-day";
import type { PlateStatus, Summary } from "@/lib/domain";
import { storyCount } from "@/lib/story-count";
import { track } from "@/lib/analytics";
import { CATCHING_UP_MESSAGE, HISTORY_PAGE_SIZE } from "@/lib/summary";
import type { PlateGuess } from "@/lib/plate-guesses.functions";
import type { PlateSummaryResult, PlateSummaryVersion } from "@/lib/summaries.functions";
import {
  STORY_PAGE_SIZE,
  type PlateStoriesResult,
  type PlateStory,
} from "@/lib/stories.functions";

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
  addStory,
  storyCount,
  hasGuess,
}: {
  addStory: ReactNode;
  storyCount: number;
  hasGuess: boolean;
}) {
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
        {addStory}
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

/** Per-story controls supplied by the caller: live hearts and menus, or inert samples. */
export type StoryActionSlots = (story: PlateStory) => { menu: ReactNode; heart: ReactNode };

function StoryCard({ story, actions }: { story: PlateStory; actions: StoryActionSlots }) {
  const owner = story.source === "owner";
  const zoom = Boolean(story.photo && story.photoBox);
  const { menu, heart } = actions(story);
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
          {menu}
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
        {heart}
      </div>
      {story.photo && !zoom && <StoryPhotoThumbnail photo={story.photo} handle={story.handle} />}
    </article>
  );
}

function Stories({
  data,
  addStory,
  actions,
}: {
  data: PlateStoriesResult;
  addStory: ReactNode;
  actions: StoryActionSlots;
}) {
  const [shown, setShown] = useState(STORY_PAGE_SIZE);
  const remaining = data.total - shown;
  return (
    <section aria-labelledby="stories-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="stories-heading" className="font-display text-3xl text-navy">
          Stories
        </h2>
        {addStory}
      </div>
      {data.pending.length > 0 && <PendingPanel />}
      <ul className="space-y-4">
        {data.stories.slice(0, shown).map((s) => (
          <li key={s.id}>
            <StoryCard story={s} actions={actions} />
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

function StatusStrip({ data }: { data: PlateStoriesResult | undefined }) {
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

const toPanel = (v: PlateSummaryVersion): PanelSummary => ({
  id: String(v.version),
  date: v.generatedAt.slice(0, 10),
  consensus: v.consensus,
  storyCount: v.storyCount,
  text: v.text,
});

const backLink =
  "inline-flex items-center gap-1 font-semibold text-navy underline-offset-4 hover:underline";

/**
 * The plate page from already-loaded data: frame, The Story So Far or the first-story
 * prompt, the guess, the status strip and the stories. The live page passes query
 * results as they arrive; the sample gallery passes fixed sample results.
 */
export function PlateDetailView({
  plate,
  backToSearch,
  from,
  signedIn,
  stories,
  summary,
  guess,
  historyOpen = false,
  actions,
  AddStory,
}: {
  plate: { id: string; jurisdiction: string; text: string };
  backToSearch?: { jurisdiction: string; text: string } | undefined;
  from?: "submissions" | undefined;
  signedIn: boolean;
  stories: PlateStoriesResult | undefined;
  summary: PlateSummaryResult | undefined;
  guess: PlateGuess | undefined;
  historyOpen?: boolean;
  actions: StoryActionSlots;
  AddStory?: ComponentType<{ className: string }> | undefined;
}) {
  const addStory = (className: string) =>
    AddStory ? (
      <AddStory className={className} />
    ) : (
      <AddStoryLink plateId={plate.id} signedIn={signedIn} className={className} />
    );
  const hiddenGuess = guess?.status === "hidden";
  const showSummary = !hiddenGuess && summary && (summary.current || summary.catchingUp);
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {backToSearch ? (
        <Link
          to="/"
          search={{ jurisdiction: backToSearch.jurisdiction, text: backToSearch.text }}
          className={backLink}
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to Search
        </Link>
      ) : from === "submissions" ? (
        <Link to="/submissions" className={backLink}>
          <ArrowLeft aria-hidden className="size-4" />
          Back to Your Submissions
        </Link>
      ) : (
        <a href="/explore" className={backLink}>
          <ArrowLeft aria-hidden className="size-4" />
          Back to Explore
        </a>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[auto_minmax(0,1fr)]">
        <PlateFrame jurisdiction={plate.jurisdiction} text={plate.text} />
        <div className="min-w-0">
          {showSummary ? (
            <SummaryPanel
              current={summary.current ? toPanel(summary.current) : undefined}
              earlier={summary.earlier.map(toPanel)}
              historyOpen={historyOpen}
              catchingUp={summary.catchingUp}
            />
          ) : (
            <MysteryPrompt
              addStory={addStory("brand-btn brand-btn-coral mt-4 inline-block")}
              storyCount={stories?.storyCount ?? 0}
              hasGuess={hiddenGuess}
            />
          )}
          {guess?.status === "revealed" && (
            <div className="mt-6">
              <PlateGuessPanel plateId={plate.id} meaning={guess.meaning} story={guess.story} />
            </div>
          )}
        </div>
      </div>
      <StatusStrip data={stories} />
      {stories && (
        <Stories data={stories} addStory={addStory("brand-btn brand-btn-coral")} actions={actions} />
      )}
    </main>
  );
}
