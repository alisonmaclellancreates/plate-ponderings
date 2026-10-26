import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, MoreHorizontal } from "lucide-react";
import { PlateOfTheDay, RecentlyFeatured } from "@/components/site/Homepage";
import { Explore } from "@/components/site/Explore";
import { PlateDetailView, type StoryActionSlots } from "@/components/site/PlateDetailView";
import { CheckingView, SpotOutcomeView, SpotPageView } from "@/components/site/SpotViews";
import { AddStoryView, type AddStoryViewProps } from "@/components/site/AddStoryView";
import { PhotoEditor } from "@/components/site/PhotoEditor";
import { DeleteStoryDialog, ReportDialog, StoryMenuList } from "@/components/site/StoryMenu";
import { HandleField, SubmissionsPage } from "@/components/site/Account";
import { SignInForm, SignUpForm } from "@/components/site/Entry";
import { AiCheckStatusPanel } from "@/components/site/AiCheckStatus";
import { DeleteConfirmPage, SettingsPage } from "@/components/site/Settings";
import { AdminPage } from "@/components/site/Admin";
import type { PlateLinkProps } from "@/components/site/plate-link";
import {
  BLOCKED_HANDLES,
  CATCHING_UP_STORY,
  CURRENT_USER,
  PNW_LV_SUMMARY,
  REPORTED_STORIES,
  STORY_PHOTO_BOX,
  STORY_PHOTO_PLACEHOLDER,
  SUBMISSIONS_SAMPLE,
  TODAY,
  asFeatured,
  featuredPlates,
} from "@/lib/mock-data";
import { samplePlate, sampleStories, sampleSummary } from "@/lib/preview-samples";
import { decodePhoto } from "@/lib/photo-canvas";
import type { Box } from "@/lib/photo-blur";
import type { PlateGuess } from "@/lib/plate-guesses.functions";
import { JURISDICTION_ERROR, TEXT_ERROR } from "@/lib/spot";
import {
  HANDLE_UNAVAILABLE,
  RATE_LIMIT_MESSAGE,
  SIGN_IN_ERROR,
  SIGN_UP_ERROR,
} from "@/lib/account-rules";
import {
  STORY_RATE_LIMIT_HEADING,
  STORY_SUBMIT_ERROR_HEADING,
  STORY_SUBMIT_ERROR_MESSAGE,
} from "@/lib/story-form";
import { findPreview } from "@/lib/preview-registry";

const noop = () => {};

/** Sample plates that have their own sample plate page. */
export const SAMPLE_PLATE_SCREENS: Record<string, string> = {
  "or-pnwlv": "plate-pnw-lv",
  "wa-b7k2l9": "plate-mystery",
  "bc-lv2code": "plate-interpreted",
  "ca-teatime": "plate-owner",
  "ut-canyons": "plate-guess-hidden",
};

/** Plate links stay inside the gallery; plates without a sample page don't navigate. */
export function SamplePlateLink({ plateId, className, children }: PlateLinkProps) {
  const screen = SAMPLE_PLATE_SCREENS[plateId];
  if (!screen) return <span className={className}>{children}</span>;
  return (
    <Link to="/previews/$screen" params={{ screen }} className={className}>
      {children}
    </Link>
  );
}

function SampleAddStory({ className }: { className: string }) {
  return (
    <Link to="/previews/$screen" params={{ screen: "story-1" }} className={className}>
      Add Your Story
    </Link>
  );
}

/** Inert story controls: the menu opens and closes, hearts show their count. */
function SampleStoryMenu({ handle, own }: { handle: string; own: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`More options for ${handle}'s story`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground"
      >
        <MoreHorizontal aria-hidden className="size-5" />
      </button>
      {open && (
        <StoryMenuList
          handle={handle}
          menu={own ? "own" : "other"}
          className="brand-card absolute right-0 top-8 z-10 w-56 p-2 shadow-md"
          onReport={() => setOpen(false)}
          onBlock={() => setOpen(false)}
          onDelete={() => setOpen(false)}
        />
      )}
    </div>
  );
}

const sampleActions: StoryActionSlots = (story) => ({
  menu: <SampleStoryMenu handle={story.handle} own={story.isOwn} />,
  heart: (
    <p className="mt-2 flex items-center gap-1 text-sm">
      <Heart aria-hidden className="size-4 text-coral" />
      <span>{story.hearts}</span>
      <span className="sr-only">{story.hearts === 1 ? "heart" : "hearts"}</span>
    </p>
  ),
});

function SamplePlatePage({
  slug,
  stories,
  summary,
  guess = { status: "absent" },
  historyOpen = false,
}: {
  slug: string;
  stories: ReturnType<typeof sampleStories>;
  summary: ReturnType<typeof sampleSummary>;
  guess?: PlateGuess;
  historyOpen?: boolean;
}) {
  const plate = samplePlate(slug);
  return (
    <PlateDetailView
      plate={{ id: slug, jurisdiction: plate.jurisdiction, text: plate.text }}
      signedIn
      stories={stories}
      summary={summary}
      guess={guess}
      historyOpen={historyOpen}
      actions={sampleActions}
      AddStory={SampleAddStory}
    />
  );
}

const lv2code = () => samplePlate("bc-lv2code");

const PENDING_STORY = {
  id: "bc-pending",
  handle: CURRENT_USER.handle,
  date: "2026-10-15",
  meaning: "They might be a level 2 coding instructor.",
  howIKnow: "guess" as const,
  hearts: 0,
};

/** The real plate box editor on the sample photo, decoded in this browser. */
export function SamplePhotoEditor({ initialBox }: { initialBox: Box | null }) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    let decoded: ImageBitmap | null = null;
    fetch(STORY_PHOTO_PLACEHOLDER)
      .then((r) => r.blob())
      .then((blob) => decodePhoto(blob))
      .then((b) => {
        decoded = b;
        if (live) setBitmap(b);
        else b.close();
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
      decoded?.close();
    };
  }, []);
  if (failed) return <p role="status">This browser couldn't open the sample photo.</p>;
  if (!bitmap) return <p role="status">Opening the sample photo…</p>;
  return (
    <PhotoEditor
      imageUrl={STORY_PHOTO_PLACEHOLDER}
      bitmap={bitmap}
      initialBox={initialBox}
      showNoBoxMessage={initialBox === null}
      onUse={noop}
      onRemove={noop}
      onChooseAnother={noop}
    />
  );
}

const STORY_BASE: AddStoryViewProps = {
  step: "1",
  plateId: "or-pnwlv",
  plate: { jurisdiction: "Oregon", text: "PNW LV" },
  how: "guess",
  meaning: "They might be saying Pacific Northwest love.",
  more: "Saw it at a trailhead near Bend.",
  ownerExists: false,
  demo: false,
  rejected: false,
  pause: null,
  submitting: false,
  photoUrl: null,
  photoUnreadable: false,
  photoBusy: false,
  onHow: noop,
  onMeaning: noop,
  onMore: noop,
  onNext: noop,
  onStep: noop,
  onChoosePhoto: noop,
  onRemovePhoto: noop,
  onSkipPhoto: noop,
  onSubmit: noop,
  PlateLink: SamplePlateLink,
};

const story = (props: Partial<AddStoryViewProps>) => <AddStoryView {...STORY_BASE} {...props} />;

const featured = () => featuredPlates().map(asFeatured);

function DialogScreen({ kind }: { kind: "report" | "delete" }) {
  const [open, setOpen] = useState(true);
  const Dialog = kind === "report" ? ReportDialog : DeleteStoryDialog;
  return (
    <main className="mx-auto max-w-xl px-4 py-12 text-center">
      <button type="button" className="brand-btn brand-btn-navy" onClick={() => setOpen(true)}>
        {kind === "report" ? "Open the report dialog" : "Open the delete dialog"}
      </button>
      <Dialog open={open} onOpenChange={setOpen} />
    </main>
  );
}

function AccountStates() {
  return (
    <main className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      <h1 className="font-display text-4xl text-navy">Account states</h1>
      <section aria-label="Handle checks" className="brand-card space-y-8 p-6">
        <HandleField draft="RoadReader" status="available" />
        <HandleField draft="maplegirl" status="taken" />
        <HandleField draft="Road Reader!" />
        <HandleField draft="RoadReader" status={null} message={HANDLE_UNAVAILABLE} />
        <HandleField draft="RoadReader" message="Changes saved." />
        <HandleField draft={CURRENT_USER.handle} isDemo />
      </section>
      <section aria-label="Sign in and sign up" className="grid gap-8 md:grid-cols-2">
        <div className="brand-card p-6">
          <SignInForm busy={false} error={SIGN_IN_ERROR} submit={(e) => e.preventDefault()} />
        </div>
        <div className="brand-card p-6">
          <SignUpForm busy={false} error={SIGN_UP_ERROR} submit={(e) => e.preventDefault()} />
        </div>
      </section>
      <AiCheckStatusPanel status={{ allowed: true }} />
    </main>
  );
}

function StoryMenus() {
  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-4 py-8 sm:grid-cols-2">
      <section aria-label="Someone else's story" className="space-y-3">
        <h2 className="font-display text-2xl text-navy">Someone else's story</h2>
        <StoryMenuList handle="maplegirl" menu="other" className="brand-card w-56 p-2" />
      </section>
      <section aria-label="Your story" className="space-y-3">
        <h2 className="font-display text-2xl text-navy">Your story</h2>
        <StoryMenuList handle={CURRENT_USER.handle} menu="own" className="brand-card w-56 p-2" />
      </section>
    </main>
  );
}

const exploreLive = (error = false) => ({
  plates: featured(),
  today: TODAY,
  hasMore: !error,
  busy: false,
  loadMore: () => Promise.resolve(),
  error,
  retry: () => Promise.resolve(),
});

/** One renderer per registry slug. */
export const PREVIEW_SCREENS: Record<string, () => ReactNode> = {
  "home-featured": () => {
    const pick = asFeatured(samplePlate("ut-canyons"));
    return (
      <main>
        <PlateOfTheDay plate={pick} PlateLink={SamplePlateLink} />
        <RecentlyFeatured
          live={{ today: TODAY, pick, recent: featured().slice(1, 5) }}
          PlateLink={SamplePlateLink}
        />
      </main>
    );
  },
  "home-fallback": () => (
    <main>
      <PlateOfTheDay plate={asFeatured(lv2code())} PlateLink={SamplePlateLink} />
    </main>
  ),
  explore: () => <Explore live={exploreLive()} PlateLink={SamplePlateLink} />,
  "explore-error": () => <Explore live={exploreLive(true)} PlateLink={SamplePlateLink} />,

  "plate-pnw-lv": () => (
    <SamplePlatePage
      slug="or-pnwlv"
      stories={sampleStories(samplePlate("or-pnwlv"))}
      summary={sampleSummary([PNW_LV_SUMMARY])}
    />
  ),
  "plate-mystery": () => (
    <SamplePlatePage
      slug="wa-b7k2l9"
      stories={sampleStories(samplePlate("wa-b7k2l9"))}
      summary={sampleSummary([])}
    />
  ),
  "plate-interpreted": () => (
    <SamplePlatePage
      slug="bc-lv2code"
      stories={sampleStories(lv2code())}
      summary={sampleSummary(lv2code().summaries)}
    />
  ),
  "plate-owner": () => (
    <SamplePlatePage
      slug="ca-teatime"
      stories={sampleStories(samplePlate("ca-teatime"))}
      summary={sampleSummary(samplePlate("ca-teatime").summaries)}
    />
  ),
  "plate-history": () => (
    <SamplePlatePage
      slug="bc-lv2code"
      stories={sampleStories(lv2code())}
      summary={sampleSummary(lv2code().summaries)}
      historyOpen
    />
  ),
  "plate-pending": () => (
    <SamplePlatePage
      slug="bc-lv2code"
      stories={sampleStories(lv2code(), { pending: [PENDING_STORY] })}
      summary={sampleSummary(lv2code().summaries)}
    />
  ),
  "plate-catching-up": () => (
    <SamplePlatePage
      slug="bc-lv2code"
      stories={sampleStories(lv2code(), { extra: [CATCHING_UP_STORY] })}
      summary={sampleSummary(lv2code().summaries, true)}
    />
  ),
  "plate-guess-hidden": () => (
    <SamplePlatePage
      slug="ut-canyons"
      stories={sampleStories(samplePlate("ut-canyons"))}
      summary={sampleSummary([])}
      guess={{ status: "hidden" }}
    />
  ),
  "plate-guess-revealed": () => (
    <SamplePlatePage
      slug="or-pnwlv"
      stories={sampleStories(samplePlate("or-pnwlv"))}
      summary={sampleSummary([PNW_LV_SUMMARY])}
      guess={{
        status: "revealed",
        meaning: "Perfectly Nice Weather, Lightly Varied",
        story:
          "A weather forecaster who promised drizzle every day finally got one bright week and ordered a plate to remember it.",
      }}
    />
  ),

  "spot-validation": () => (
    <SpotPageView
      values={{ text: "B7K2L9!" }}
      errors={{ jurisdiction: JURISDICTION_ERROR, text: TEXT_ERROR }}
      onSpot={noop}
    />
  ),
  "spot-demo": () => <SpotPageView isDemo onSpot={noop} />,
  "spot-checking": () => <CheckingView />,
  "spot-exists": () => (
    <SpotOutcomeView
      result={{
        outcome: "exists",
        plate: { id: "bc-lv2code", jurisdiction: "British Columbia", text: "LV2CODE" },
      }}
      PlateLink={SamplePlateLink}
    />
  ),
  "spot-new": () => (
    <SpotOutcomeView
      result={{
        outcome: "new",
        plate: { id: "wa-b7k2l9", jurisdiction: "Washington", text: "B7K2L9" },
      }}
      PlateLink={SamplePlateLink}
    />
  ),
  "spot-pending": () => <SpotOutcomeView result={{ outcome: "pending" }} />,
  "spot-rejected": () => <SpotOutcomeView result={{ outcome: "rejected" }} />,
  "spot-already-spotted": () => (
    <SpotPageView
      values={{ jurisdiction: "Utah", text: "TRAILS" }}
      alreadySpotted={{ jurisdiction: "Utah", text: "TRAILS" }}
      onSpot={noop}
    />
  ),
  "spot-paused": () => (
    <SpotOutcomeView result={{ outcome: "rate-limited", message: RATE_LIMIT_MESSAGE }} />
  ),
  "spot-error": () => <SpotOutcomeView result={{ outcome: "error" }} />,

  "story-1": () => story({}),
  "story-owner-exists": () =>
    story({
      plateId: "ca-teatime",
      plate: { jurisdiction: "California", text: "TEATIME" },
      how: "owner",
      meaning: "They might be a lifelong tea lover.",
      more: "",
      ownerExists: true,
    }),
  "story-photo": () => story({ step: "2" }),
  "story-photo-adjust": () =>
    story({ step: "2", editor: <SamplePhotoEditor initialBox={STORY_PHOTO_BOX} /> }),
  "story-photo-no-box": () => story({ step: "2", editor: <SamplePhotoEditor initialBox={null} /> }),
  "story-photo-ready": () => story({ step: "2", photoUrl: STORY_PHOTO_PLACEHOLDER }),
  "story-photo-unreadable": () => story({ step: "2", photoUnreadable: true }),
  "story-3": () => story({ step: "3", photoUrl: STORY_PHOTO_PLACEHOLDER }),
  "story-done": () => story({ step: "done" }),
  "story-checking": () => story({ step: "checking" }),
  "story-rejected": () => story({ rejected: true }),
  "story-paused": () =>
    story({ pause: { heading: STORY_RATE_LIMIT_HEADING, message: RATE_LIMIT_MESSAGE } }),
  "story-error": () =>
    story({ pause: { heading: STORY_SUBMIT_ERROR_HEADING, message: STORY_SUBMIT_ERROR_MESSAGE } }),
  "story-demo": () => story({ demo: true, how: "owner", meaning: "They might be ", more: "" }),

  "story-menus": () => <StoryMenus />,
  "story-report": () => <DialogScreen kind="report" />,
  "story-delete": () => <DialogScreen kind="delete" />,

  // Rows open no plate page here: the sample plate states are listed in the gallery.
  submissions: () => (
    <SubmissionsPage rows={SUBMISSIONS_SAMPLE.map((row) => ({ ...row, plateState: undefined }))} />
  ),
  "account-states": () => <AccountStates />,
  settings: () => (
    <SettingsPage blocked={BLOCKED_HANDLES.map((handle) => ({ key: handle, handle }))} />
  ),
  "settings-delete-confirm": () => <DeleteConfirmPage />,

  admin: () => (
    <AdminPage
      rows={REPORTED_STORIES}
      aiStatus={<AiCheckStatusPanel status={{ allowed: true }} />}
    />
  ),
  "admin-ai-paused": () => (
    <AdminPage
      rows={REPORTED_STORIES}
      aiStatus={
        <AiCheckStatusPanel
          status={{ allowed: false, category: "credits", blockedAt: "2026-10-16T09:30:00Z" }}
        />
      }
    />
  ),
};

/** A sample screen under a strip that says it's a sample and leads back to the gallery. */
export function PreviewScreen({ slug }: { slug: string }) {
  const entry = findPreview(slug);
  const render = PREVIEW_SCREENS[slug];
  if (!entry || !render) return null;
  return (
    <>
      <div
        role="note"
        className="flex flex-wrap items-center justify-between gap-2 bg-gold px-4 py-2 text-sm text-navy"
      >
        <span>
          <span className="font-semibold">Sample screen:</span> {entry.group}, {entry.label}.
          Nothing here is saved.
        </span>
        <Link to="/previews" className="font-semibold underline underline-offset-4">
          All previews
        </Link>
      </div>
      {render()}
    </>
  );
}
