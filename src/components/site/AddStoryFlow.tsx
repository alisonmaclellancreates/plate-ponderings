import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Info } from "lucide-react";
import { Plate } from "@/components/site/Plate";
import { Outcome } from "@/components/site/SpotPlate";
import { PhotoEditor } from "@/components/site/PhotoEditor";
import { getPlate } from "@/lib/plates.functions";
import { addStory, getPlateStories, type HowKey } from "@/lib/stories.functions";
import { detectPlateBox, uploadStoryPhoto } from "@/lib/photos.functions";
import { blobToDataUrl, decodePhoto, toDetectDataUrl } from "@/lib/photo-canvas";
import type { Box } from "@/lib/photo-blur";
import {
  HOW_OPTIONS,
  MEANING_MAX,
  MORE_MAX,
  STORY_RATE_LIMIT_HEADING,
  STORY_SUBMIT_ERROR_HEADING,
  STORY_SUBMIT_ERROR_MESSAGE,
} from "@/lib/story-form";
import { useAccountAuth } from "@/lib/account-auth";
import { track } from "@/lib/analytics";

const DEMO_FORM_MESSAGE = "Adding stories is turned off in the demo.";
const UNREADABLE_PHOTO_MESSAGE =
  "We couldn't read this photo. You can choose another, or continue without one.";
const PHOTO_UPLOAD_NOTE =
  "We'll suggest the license plate area and blur everything else. You'll review and adjust it before sharing. The original photo is sent for detection and is never stored by our application.";

const outline = "brand-btn brand-btn-outline";
const coral = "brand-btn brand-btn-coral";

/** A chosen photo being worked on: the decoded image and its display URL. */
type PhotoDraft = {
  bitmap: ImageBitmap;
  imageUrl: string;
  suggestion: Box | null;
  noBoxMessage: boolean;
};

/** The confirmed photo: uploaded path plus the processed preview for review. */
type PhotoReady = { path: string; previewUrl: string };

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

/**
 * Inert preview input: seeds the plate, draft and notice, and makes the flow
 * read-only against the backend. No queries run, submit does nothing, and no
 * analytics events are sent. When absent, behaviour is unchanged.
 */
export type AddStoryPreview = {
  plate: { id: string; jurisdiction: string; text: string };
  draft: { how: HowKey; meaning: string; more: string };
  notice: { heading: string | null; message: string };
};

/** The real three-step story flow for a published plate. */
export function AddStoryFlow({ plateId, preview }: { plateId: string; preview?: AddStoryPreview }) {
  const [step, setStep] = useState<FlowStep>("1");
  const [how, setHow] = useState<HowKey>(preview?.draft.how ?? "owner");
  const [meaning, setMeaning] = useState(preview?.draft.meaning ?? "");
  const [more, setMore] = useState(preview?.draft.more ?? "");
  const [rejected, setRejected] = useState(false);
  const [pause, setPause] = useState<{ heading: string | null; message: string } | null>(
    preview?.notice ?? null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [photoDraft, setPhotoDraft] = useState<PhotoDraft | null>(null);
  const [photoReady, setPhotoReady] = useState<PhotoReady | null>(null);
  const [photoUnreadable, setPhotoUnreadable] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const started = useRef(false);

  const { data: plateData } = useQuery({
    queryKey: ["plate", plateId],
    queryFn: () => getPlate({ data: { id: plateId } }),
    enabled: !preview,
  });
  const { data: storiesData } = useQuery({
    queryKey: ["plate-stories", plateId],
    queryFn: () => getPlateStories({ data: { plateId } }),
    enabled: !preview,
  });
  const auth = useAccountAuth();
  const demo = Boolean(auth?.account?.isDemo);
  const submitStory = useServerFn(addStory);
  const detectBox = useServerFn(detectPlateBox);
  const uploadPhoto = useServerFn(uploadStoryPhoto);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      if (!preview) void track("story_started", {});
    }
  }, [preview]);

  const plate = preview?.plate ?? plateData?.plate;

  const choosePhoto = async (file: File | undefined) => {
    if (!file || preview) return;
    setPhotoUnreadable(false);
    let bitmap: ImageBitmap;
    try {
      bitmap = await decodePhoto(file);
    } catch {
      setPhotoUnreadable(true);
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    // Detection is a shortcut, never a gate: any failure means draw the box.
    try {
      const result = await detectBox({ data: { image: toDetectDataUrl(bitmap) } });
      setPhotoDraft({
        bitmap,
        imageUrl,
        suggestion: result.outcome === "ok" ? result.box : null,
        noBoxMessage: result.outcome !== "ok" || result.box === null,
      });
    } catch {
      setPhotoDraft({ bitmap, imageUrl, suggestion: null, noBoxMessage: true });
    }
  };

  const retryDetect = async () => {
    if (!photoDraft) return;
    try {
      const result = await detectBox({ data: { image: toDetectDataUrl(photoDraft.bitmap) } });
      setPhotoDraft({
        ...photoDraft,
        suggestion: result.outcome === "ok" ? result.box : null,
        noBoxMessage: result.outcome !== "ok" || result.box === null,
      });
    } catch {
      setPhotoDraft({ ...photoDraft, suggestion: null, noBoxMessage: true });
    }
  };

  const handleUsePhoto = async (blob: Blob, adjusted: boolean) => {
    if (!photoDraft || preview) return;
    setPhotoBusy(true);
    try {
      const uploaded = await uploadPhoto({ data: { jpeg: await blobToDataUrl(blob) } });
      if (uploaded.outcome !== "ok") {
        setPause({ heading: STORY_SUBMIT_ERROR_HEADING, message: STORY_SUBMIT_ERROR_MESSAGE });
        setPhotoDraft(null);
        return;
      }
      void track("photo_added", {
        box_found: photoDraft.suggestion !== null,
        box_adjusted: adjusted,
      });
      setPhotoReady({ path: uploaded.path, previewUrl: URL.createObjectURL(blob) });
      setPhotoDraft(null);
    } catch {
      setPause({ heading: STORY_SUBMIT_ERROR_HEADING, message: STORY_SUBMIT_ERROR_MESSAGE });
      setPhotoDraft(null);
    } finally {
      setPhotoBusy(false);
    }
  };

  const skipPhoto = () => {
    if (!preview) void track("photo_skipped", {});
    setStep("3");
  };

  if (!plate) return null;
  const ownerExists = preview ? false : (storiesData?.hasOwnerStory ?? false);

  const onSubmit = async () => {
    if (preview) return;
    setSubmitting(true);
    setRejected(false);
    setPause(null);
    try {
      const result = await submitStory({
        data: { plateId, meaning, source: how, more, photoPath: photoReady?.path ?? "" },
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
      } else if (result.outcome === "rate-limited") {
        setPause({ heading: STORY_RATE_LIMIT_HEADING, message: result.message });
        setStep("1");
      } else if (result.outcome === "demo") {
        setPause({ heading: null, message: result.message });
        setStep("1");
      } else {
        setPause({
          heading: STORY_SUBMIT_ERROR_HEADING,
          message: STORY_SUBMIT_ERROR_MESSAGE,
        });
        setStep("1");
      }
    } catch {
      void track("story_submitted", {
        source: how,
        has_more_text: more.trim().length > 0,
        outcome: "error",
      });
      setPause({
        heading: STORY_SUBMIT_ERROR_HEADING,
        message: STORY_SUBMIT_ERROR_MESSAGE,
      });
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
          <Link to="/plate/$state" params={{ state: plateId }} className="brand-btn brand-btn-navy">
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
            <button type="button" onClick={skipPhoto} className={coral}>
              Continue without a photo
            </button>
          </>
        }
      >
        <h2 className="font-display text-2xl text-navy">Add a photo (optional)</h2>
        {photoReady ? (
          <div className="space-y-3">
            <img
              src={photoReady.previewUrl}
              alt="Your processed photo, blurred except the plate"
              className="w-full rounded-lg"
            />
            <button
              type="button"
              className={outline}
              onClick={() => {
                setPhotoReady(null);
                if (!preview) void track("photo_skipped", {});
              }}
            >
              Remove Photo
            </button>
            <button type="button" className={coral} onClick={() => setStep("3")}>
              Next
            </button>
          </div>
        ) : (
          <>
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
                disabled={demo || photoBusy}
                onChange={(e) => void choosePhoto(e.target.files?.[0])}
              />
            </label>
            {photoUnreadable && (
              <p role="status" className="rounded-lg bg-cream-warm p-4">
                {UNREADABLE_PHOTO_MESSAGE}
              </p>
            )}
            <p className="flex items-start gap-2 rounded-lg bg-cream-warm p-4">
              <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-teal" />
              {PHOTO_UPLOAD_NOTE}
            </p>
          </>
        )}
        {photoDraft && (
          <PhotoEditor
            imageUrl={photoDraft.imageUrl}
            bitmap={photoDraft.bitmap}
            initialBox={photoDraft.suggestion}
            showNoBoxMessage={photoDraft.noBoxMessage}
            onUse={(blob, adjusted) => void handleUsePhoto(blob, adjusted)}
            onRemove={() => {
              setPhotoDraft(null);
              if (!preview) void track("photo_skipped", {});
            }}
            onRetry={() => void retryDetect()}
          />
        )}
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
        <div
          className={
            photoReady ? "grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start" : ""
          }
        >
          {photoReady && (
            <img
              src={photoReady.previewUrl}
              alt="Your blurred photo"
              className="w-full rounded-lg"
            />
          )}
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
        </div>
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
            disabled={demo || meaning.trim().length < 3}
            className={coral}
          >
            Next
          </button>
        </>
      }
    >
      {demo && (
        <div role="status" className="brand-card bg-cream-warm p-4">
          <p className="font-semibold">{DEMO_FORM_MESSAGE}</p>
        </div>
      )}
      {rejected && (
        <div role="status" className="brand-card bg-cream-warm p-4">
          <p className="font-semibold">We couldn't add this story.</p>
          <p className="mt-1">
            Our automated check couldn't approve it. Sometimes these checks get things wrong. Your
            words are still here if you'd like to edit and try again.
          </p>
        </div>
      )}
      {pause && (
        <div role="status" className="brand-card bg-cream-warm p-4">
          {pause.heading && <p className="font-semibold">{pause.heading}</p>}
          <p className={pause.heading ? "mt-1" : "font-semibold"}>{pause.message}</p>
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
                  disabled={demo}
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
          disabled={demo}
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
          disabled={demo}
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
