import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Camera, Info } from "lucide-react";
import { Plate } from "@/components/site/Plate";
import { Outcome } from "@/components/site/SpotPlate";
import { PLATES, STORY_PHOTO_PLACEHOLDER, type HowIKnow } from "@/lib/mock-data";

export type StoryStep =
  "1" | "1-owner-exists" | "2" | "2-adjust" | "2-review" | "3" | "done" | "checking" | "rejected";

export const STORY_STEPS: Record<StoryStep, string> = {
  "1": "Your story",
  "1-owner-exists": "Your story, owner already here",
  "2": "Photo",
  "2-adjust": "Adjust the plate area",
  "2-review": "Review your photo",
  "3": "Review and submit",
  done: "Story submitted",
  checking: "Being checked",
  rejected: "Couldn't add this story",
};

export const MEANING_MAX = 80;
export const MORE_MAX = 500;

export const HOW_OPTIONS: { value: HowIKnow; label: string; image: string }[] = [
  { value: "owner", label: "It's my plate", image: "/brand/how-i-know-owner-v1.webp" },
  { value: "knows", label: "I know the owner", image: "/brand/how-i-know-knows-owner-v1.webp" },
  { value: "asked", label: "I asked the driver", image: "/brand/how-i-know-asked-driver-v1.webp" },
  { value: "guess", label: "My best guess", image: "/brand/how-i-know-guess-v1.webp" },
];

/** Sample answers shown on review and on the rejected step; preview only. */
export const SAMPLE_STORY = {
  how: "owner" as HowIKnow,
  meaning: "Pacific Northwest love.",
  more: "I grew up near Portland and wanted a plate that says where my heart is.",
};

const outline = "brand-btn brand-btn-outline";
const coral = "brand-btn brand-btn-coral";
const plate = PLATES.find((p) => p.slug === "or-pnwlv")!;

/** Small plate with its name: beside it on desktop, a compact strip on phones. */
function PlateHeader() {
  return (
    <div
      data-testid="plate-header"
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 sm:gap-4 sm:px-4 sm:py-3"
    >
      <Plate
        jurisdiction={plate.jurisdiction}
        text={plate.text}
        size="sm"
        className="w-20 sm:w-32"
      />
      <p className="min-w-0 text-sm sm:text-lg">
        <span className="font-semibold">{plate.text}</span>
        <span className="text-muted-foreground"> · {plate.jurisdiction}</span>
      </p>
    </div>
  );
}

function Stepper({ current }: { current: 1 | 2 | 3 }) {
  const labels = ["Your story", "Photo", "Review"];
  return (
    <ol aria-label="Steps" className="flex gap-2 text-sm sm:gap-4">
      {labels.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={`flex flex-1 items-center gap-2 border-t-4 pt-2 ${active ? "border-coral-cta font-semibold" : "border-border text-muted-foreground"}`}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full ${active ? "bg-navy text-cream" : "bg-card"}`}
            >
              {n}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function Shell({
  step,
  children,
  actions,
}: {
  step: 1 | 2 | 3;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:py-10">
      <PlateHeader />
      <h1 className="font-display text-3xl text-navy sm:text-4xl">Add Your Story</h1>
      <Stepper current={step} />
      {children}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
        {actions}
      </div>
    </main>
  );
}

function Counter({ id, value, max }: { id: string; value: string; max: number }) {
  return (
    <p id={id} className="mt-1 text-right text-sm text-muted-foreground">
      {value.length}/{max}
    </p>
  );
}

export function StoryStepOne({
  initial = { how: "owner", meaning: "", more: "" },
  ownerExists = false,
  rejected = false,
}: {
  initial?: { how: HowIKnow; meaning: string; more: string };
  ownerExists?: boolean;
  rejected?: boolean;
}) {
  const [how, setHow] = useState<HowIKnow>(initial.how);
  const [meaning, setMeaning] = useState(initial.meaning);
  const [more, setMore] = useState(initial.more);
  return (
    <Shell
      step={1}
      actions={
        <>
          <Link to="/plate/$state" params={{ state: "pnw-lv" }} className={outline}>
            Cancel
          </Link>
          <Link to="/story/$step" params={{ step: "2" }} className={coral}>
            Next
          </Link>
        </>
      }
    >
      {rejected && (
        <div role="status" className="brand-card bg-cream-warm p-4">
          <p className="font-semibold">We couldn't add this story.</p>
          <p className="mt-1">
            Our automated check couldn't approve it. Sometimes these checks get things wrong. Your
            words are still here if you'd like to edit and try again.
          </p>
        </div>
      )}
      <fieldset>
        <legend className="mb-3 font-display text-2xl text-navy">How do you know?</legend>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {HOW_OPTIONS.map((o) => {
            const selected = how === o.value;
            return (
              <label
                key={o.value}
                className={`brand-card flex cursor-pointer flex-col items-center gap-2 p-3 text-center font-semibold transition focus-within:ring-2 focus-within:ring-teal focus-within:ring-offset-2 ${selected ? "border-2 border-teal bg-cream-warm" : "bg-card"}`}
              >
                <input
                  type="radio"
                  name="how-do-you-know"
                  value={o.value}
                  checked={selected}
                  onChange={() => setHow(o.value)}
                  className="sr-only"
                />
                <img src={o.image} alt="" className="h-20 w-auto sm:h-24" />
                {o.label}
              </label>
            );
          })}
        </div>
        {ownerExists && (
          <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            Someone has already said this is their plate. Yours will appear alongside theirs.
          </p>
        )}
      </fieldset>
      <div>
        <label htmlFor="story-meaning" className="mb-1 block font-semibold">
          What do you think it means? <span className="sr-only">(required)</span>
          <span aria-hidden className="text-coral-cta">
            *
          </span>
        </label>
        <input
          id="story-meaning"
          required
          maxLength={MEANING_MAX}
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          placeholder="A short, clear meaning for this plate"
          aria-describedby="story-meaning-count"
          className="h-11 w-full rounded-lg border border-input bg-card px-3"
        />
        <Counter id="story-meaning-count" value={meaning} max={MEANING_MAX} />
      </div>
      <div>
        <label htmlFor="story-more" className="mb-1 block font-semibold">
          Tell us more <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="story-more"
          rows={4}
          maxLength={MORE_MAX}
          value={more}
          onChange={(e) => setMore(e.target.value)}
          aria-describedby="story-more-hint story-more-count"
          className="w-full rounded-lg border border-input bg-card px-3 py-2"
        />
        <p id="story-more-hint" className="text-sm text-muted-foreground">
          Keep places general, like near Seattle
        </p>
        <Counter id="story-more-count" value={more} max={MORE_MAX} />
      </div>
    </Shell>
  );
}

function PhotoStep() {
  return (
    <Shell
      step={2}
      actions={
        <>
          <Link to="/story/$step" params={{ step: "1" }} className={outline}>
            Back
          </Link>
          <Link to="/story/$step" params={{ step: "3" }} className={coral}>
            Next
          </Link>
        </>
      }
    >
      <h2 className="font-display text-2xl text-navy">Add a photo (optional)</h2>
      <label
        htmlFor="story-photo"
        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-teal bg-card px-4 py-10 text-center"
      >
        <Camera aria-hidden className="size-10 text-teal" />
        <span className="font-semibold">Choose a photo or drag and drop</span>
        <span className="text-sm text-muted-foreground">JPEG, PNG, or WebP</span>
        <input
          id="story-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
        />
      </label>
      <p className="flex items-start gap-2 rounded-lg bg-cream-warm p-4">
        <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-teal" />
        We'll suggest the license plate area and blur everything else. You'll review and adjust it
        before sharing. The original photo is sent for detection and is never stored by our
        application.
      </p>
      <p className="text-sm text-muted-foreground">
        If your photo can't be read, we'll let you know and you can continue without one.
      </p>
    </Shell>
  );
}

/** Modal over step 2 on desktop, full-screen on phones. */
function Editor({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-navy/60 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        className="h-full w-full overflow-y-auto bg-cream p-5 sm:h-auto sm:max-h-full sm:max-w-4xl sm:rounded-xl sm:p-8"
      >
        <h2 id="editor-title" className="font-display text-3xl text-navy">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function AdjustEditor() {
  const handle = "absolute size-3 rounded-sm border-2 border-navy bg-cream";
  return (
    <Editor title="Adjust the plate area">
      <div className="relative overflow-hidden rounded-lg">
        <img
          src={STORY_PHOTO_PLACEHOLDER}
          alt="Your photo with everything blurred except the plate"
          className="w-full"
        />
        <div
          data-testid="plate-box"
          className="absolute left-[37%] top-[46%] h-[12%] w-[25%] border-2 border-cream shadow-[0_0_0_2px_var(--navy)]"
        >
          <span className={`${handle} -left-1.5 -top-1.5`} />
          <span className={`${handle} -right-1.5 -top-1.5`} />
          <span className={`${handle} -bottom-1.5 -left-1.5`} />
          <span className={`${handle} -bottom-1.5 -right-1.5`} />
        </div>
      </div>
      <p className="mt-3">Move and resize the box so only the license plate is clear.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button type="button" className={outline}>
          Reset
        </button>
        <button type="button" className={outline}>
          Try again
        </button>
        <Link to="/story/$step" params={{ step: "2-review" }} className={`${coral} sm:ml-auto`}>
          Next
        </Link>
      </div>
    </Editor>
  );
}

function ReviewEditor() {
  return (
    <Editor title="Review your photo">
      <div className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start">
        <img
          src={STORY_PHOTO_PLACEHOLDER}
          alt="Your processed photo, blurred except the plate"
          data-testid="processed-photo"
          className="w-full rounded-lg"
        />
        <div className="brand-card bg-cream-warm p-5">
          <h3 className="font-display text-2xl text-navy">Does this look right?</h3>
          <p className="mt-2">
            Before you share, check that faces, addresses, and other plates are blurred.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <Link to="/story/$step" params={{ step: "3" }} className={coral}>
              Use This Photo
            </Link>
            <Link to="/story/$step" params={{ step: "2-adjust" }} className={outline}>
              Adjust
            </Link>
            <Link to="/story/$step" params={{ step: "2" }} className={outline}>
              Remove Photo
            </Link>
          </div>
        </div>
      </div>
    </Editor>
  );
}

function ReviewStep() {
  const how = HOW_OPTIONS.find((o) => o.value === SAMPLE_STORY.how)!;
  return (
    <Shell
      step={3}
      actions={
        <>
          <Link to="/story/$step" params={{ step: "2" }} className={outline}>
            Back
          </Link>
          <Link to="/story/$step" params={{ step: "done" }} className={coral}>
            Submit Story
          </Link>
        </>
      }
    >
      <h2 className="font-display text-2xl text-navy">Review &amp; Submit</h2>
      <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start">
        <img src={STORY_PHOTO_PLACEHOLDER} alt="Your blurred photo" className="w-full rounded-lg" />
        <dl className="brand-card space-y-4 bg-card p-5">
          <div>
            <dt className="text-sm font-semibold text-muted-foreground">How I know</dt>
            <dd>{how.label}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-muted-foreground">What you think it means</dt>
            <dd>{SAMPLE_STORY.meaning}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-muted-foreground">Your story</dt>
            <dd>{SAMPLE_STORY.more}</dd>
          </div>
        </dl>
      </div>
    </Shell>
  );
}

export function StoryStepPage({ step }: { step: StoryStep }) {
  switch (step) {
    case "1":
      return <StoryStepOne />;
    case "1-owner-exists":
      return <StoryStepOne ownerExists />;
    case "rejected":
      return <StoryStepOne initial={SAMPLE_STORY} rejected />;
    case "2":
      return <PhotoStep />;
    case "2-adjust":
      return (
        <>
          <PhotoStep />
          <AdjustEditor />
        </>
      );
    case "2-review":
      return (
        <>
          <PhotoStep />
          <ReviewEditor />
        </>
      );
    case "3":
      return <ReviewStep />;
    case "done":
      return (
        <Outcome
          sign="Add Your Story"
          heading="Story submitted!"
          actions={
            <>
              <Link
                to="/plate/$state"
                params={{ state: "pnw-lv" }}
                className="brand-btn brand-btn-navy"
              >
                View This Plate
              </Link>
              <a href="/explore" className={outline}>
                Back to Explore
              </a>
            </>
          }
        >
          <p className="text-lg">Your story has been added to this plate. Thanks for sharing!</p>
        </Outcome>
      );
    case "checking":
      return (
        <Outcome
          sign="Add Your Story"
          heading="Your story is being checked."
          actions={
            <>
              <a href="/submissions" className="brand-btn brand-btn-navy">
                Go to Your Submissions
              </a>
              <a href="/explore" className={outline}>
                Back to Explore
              </a>
            </>
          }
        >
          <p className="text-lg">
            Your story is waiting for its safety check. You can see its status anytime in Your
            Submissions.
          </p>
        </Outcome>
      );
  }
}
