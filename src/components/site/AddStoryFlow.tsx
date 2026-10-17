import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useServerFn } from "@tanstack/react-start";
import { Info } from "lucide-react";
import { Plate } from "@/components/site/Plate";
import { Outcome } from "@/components/site/SpotPlate";
import { getPlate } from "@/lib/plates.functions";
import { addStory, getPlateStories, type HowKey } from "@/lib/stories.functions";
import { HOW_OPTIONS, MEANING_MAX, MORE_MAX } from "@/lib/story-form";
import { track } from "@/lib/analytics";

const outline = "brand-btn brand-btn-outline";
const coral = "brand-btn brand-btn-coral";

type FlowStep = "1" | "2" | "3" | "done" | "checking";

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
  plate,
  children,
  actions,
}: {
  step: 1 | 2 | 3;
  plate: { jurisdiction: string; text: string };
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:py-10">
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
      <h1 className="font-display text-3xl text-navy sm:text-4xl">Add Your Story</h1>
      <Stepper current={step} />
      {children}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
        {actions}
      </div>
    </main>
  );
}

/** The real three-step story flow for a published plate. */
export function AddStoryFlow({ plateId }: { plateId: string }) {
  const [step, setStep] = useState<FlowStep>("1");
  const [how, setHow] = useState<HowKey>("owner");
  const [meaning, setMeaning] = useState("");
  const [more, setMore] = useState("");
  const [rejected, setRejected] = useState(false);
  const [pauseMessage, setPauseMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const started = useRef(false);

  const { data: plateData } = useQuery({
    queryKey: ["plate", plateId],
    queryFn: () => getPlate({ data: { id: plateId } }),
  });
  const { data: storiesData } = useQuery({
    queryKey: ["plate-stories", plateId],
    queryFn: () => getPlateStories({ data: { plateId } }),
  });
  const submitStory = useServerFn(addStory);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      void track("story_started", {});
    }
  }, []);

  const plate = plateData?.plate;
  if (!plate) return null;
  const ownerExists = storiesData?.hasOwnerStory ?? false;

  const onSubmit = async () => {
    setSubmitting(true);
    setRejected(false);
    setPauseMessage(null);
    try {
      const result = await submitStory({
        data: { plateId, meaning, source: how, more },
      });
      const outcome =
        result.outcome === "rate-limited"
          ? "rate_limited"
          : result.outcome === "demo" || result.outcome === "validation"
            ? "error"
            : result.outcome;
      void track("story_submitted", {
        source: how,
        has_more_text: more.trim().length > 0,
        outcome,
      });
      if (result.outcome === "published") setStep("done");
      else if (result.outcome === "pending") setStep("checking");
      else if (result.outcome === "rejected") {
        setRejected(true);
        setStep("1");
      } else if (result.outcome === "rate-limited" || result.outcome === "demo") {
        setPauseMessage(result.message);
        setStep("1");
      } else {
        setPauseMessage("Hmm... something went wrong.");
        setStep("1");
      }
    } catch {
      void track("story_submitted", {
        source: how,
        has_more_text: more.trim().length > 0,
        outcome: "error",
      });
      setPauseMessage("Hmm... something went wrong.");
      setStep("1");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <Outcome
        sign="Add Your Story"
        heading="Story submitted!"
        actions={
          <Link
            to="/plate/$state"
            params={{ state: plateId }}
            className="brand-btn brand-btn-navy"
          >
            View This Plate
          </Link>
        }
      >
        <p className="text-lg">Your story has been added to this plate. Thanks for sharing!</p>
      </Outcome>
    );
  }
  if (step === "checking") {
    return (
      <Outcome
        sign="Add Your Story"
        heading="Your story is being checked."
        actions={
          <a href="/submissions" className="brand-btn brand-btn-navy">
            Go to Your Submissions
          </a>
        }
      >
        <p className="text-lg">
          Your story is waiting for its safety check. You can see its status anytime in Your
          Submissions.
        </p>
      </Outcome>
    );
  }

  if (step === "2") {
    return (
      <Shell
        step={2}
        plate={plate}
        actions={
          <>
            <button type="button" onClick={() => setStep("1")} className={outline}>
              Back
            </button>
            <button type="button" onClick={() => setStep("3")} className={coral}>
              Continue without a photo
            </button>
          </>
        }
      >
        <h2 className="font-display text-2xl text-navy">Add a photo (optional)</h2>
        <p className="flex items-start gap-2 rounded-lg bg-cream-warm p-4">
          <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-teal" />
          Photo sharing is on its way. For now, you can continue without a photo.
        </p>
      </Shell>
    );
  }

  if (step === "3") {
    const howLabel = HOW_OPTIONS.find((o) => o.value === how)?.label ?? how;
    return (
      <Shell
        step={3}
        plate={plate}
        actions={
          <>
            <button type="button" onClick={() => setStep("2")} className={outline}>
              Back
            </button>
            <button
              type="button"
              onClick={() => void onSubmit()}
              disabled={submitting}
              className={coral}
            >
              Submit Story
            </button>
          </>
        }
      >
        <h2 className="font-display text-2xl text-navy">Review &amp; Submit</h2>
        <dl className="brand-card space-y-4 bg-card p-5">
          <div>
            <dt className="text-sm font-semibold text-muted-foreground">How I know</dt>
            <dd>{howLabel}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-muted-foreground">
              What you think it means
            </dt>
            <dd>{meaning}</dd>
          </div>
          {more.trim() && (
            <div>
              <dt className="text-sm font-semibold text-muted-foreground">Your story</dt>
              <dd>{more}</dd>
            </div>
          )}
        </dl>
      </Shell>
    );
  }

  return (
    <Shell
      step={1}
      plate={plate}
      actions={
        <>
          <Link to="/plate/$state" params={{ state: plateId }} className={outline}>
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => setStep("2")}
            disabled={meaning.trim().length < 3}
            className={coral}
          >
            Next
          </button>
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
      {pauseMessage && (
        <div role="status" className="brand-card bg-cream-warm p-4">
          <p className="font-semibold">{pauseMessage}</p>
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
        {ownerExists && how === "owner" && (
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
        <p id="story-meaning-count" className="mt-1 text-right text-sm text-muted-foreground">
          {meaning.length}/{MEANING_MAX}
        </p>
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
        <p id="story-more-count" className="mt-1 text-right text-sm text-muted-foreground">
          {more.length}/{MORE_MAX}
        </p>
      </div>
    </Shell>
  );
}
