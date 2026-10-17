import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Car, Search } from "lucide-react";
import { Plate } from "@/components/site/Plate";
import { JURISDICTION_GROUPS } from "@/lib/jurisdictions";
import { spotPlate, type SpotResult } from "@/lib/plates.functions";
import { useAccountAuth } from "@/lib/account-auth";
import { DEMO_MESSAGE, RATE_LIMIT_MESSAGE } from "@/lib/account-rules";
import { track } from "@/lib/analytics";
import {
  JURISDICTION_ERROR,
  TEXT_ERROR,
  validateSpot,
  type SpotErrors,
  type SpotValues,
} from "@/lib/spot";

/** Rowan's signpost as decoration beside the sign's live text on a cream surface. */
export function ScenicHeader({
  title,
  subtitle,
  asHeading = false,
}: {
  title: string;
  subtitle?: string;
  asHeading?: boolean;
}) {
  const Title = asHeading ? "h1" : "p";
  return (
    <div className="flex items-center justify-center gap-4 bg-cream-warm px-4 pb-6 pt-8">
      <img
        src="/brand/signpost-v1.webp"
        alt=""
        width={700}
        height={1050}
        data-testid="signpost"
        className="hidden h-36 w-auto shrink-0 sm:block"
      />
      <div data-testid="sign" className="brand-card max-w-md bg-cream px-6 py-4 text-center">
        <Title className="font-display text-3xl text-navy">{title}</Title>
        {subtitle && <p className="mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function Sasquatch() {
  return (
    <img
      src="/brand/sasquatch-v1.webp"
      alt=""
      width={700}
      height={727}
      data-testid="sasquatch"
      className="h-40 w-auto"
    />
  );
}

function Placeholder({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="mx-auto flex size-32 items-center justify-center gap-1 rounded-full border-2 border-dashed border-teal bg-card text-teal"
    >
      {children}
    </div>
  );
}

const outline = "brand-btn brand-btn-outline";

/** Shared outcome layout: scenic header, heading, body, one or two buttons. */
export function Outcome({
  sign,
  heading,
  children,
  actions,
  footer,
}: {
  sign: string;
  heading: string;
  children: ReactNode;
  actions: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main>
      <ScenicHeader title={sign} />
      <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-8 text-center">
        <h1 className="font-display text-4xl text-navy">{heading}</h1>
        {children}
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">{actions}</div>
        {footer}
      </section>
    </main>
  );
}

function FieldError({ id, message }: { id: string; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 flex items-center gap-1 text-sm text-coral-cta">
      <AlertCircle aria-hidden className="size-4 shrink-0" />
      {message}
    </p>
  );
}

export function SpotForm({
  values = {},
  errors: initialErrors = {},
  busy = false,
  isDemo = false,
  onSpot,
}: {
  values?: SpotValues | undefined;
  errors?: SpotErrors | undefined;
  busy?: boolean;
  isDemo?: boolean;
  onSpot?: ((values: { jurisdiction: string; text: string }) => void) | undefined;
}) {
  const [errors, setErrors] = useState<SpotErrors>(initialErrors);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || isDemo) return;
    const data = new FormData(e.currentTarget);
    const next = {
      jurisdiction: String(data.get("jurisdiction") ?? ""),
      text: String(data.get("text") ?? ""),
    };
    const found = validateSpot(next);
    setErrors(found);
    if (!found.jurisdiction && !found.text) onSpot?.(next);
  };
  const textDescribedBy = ["spot-text-limit", errors.text && "spot-text-error"]
    .filter(Boolean)
    .join(" ");
  return (
    <form
      noValidate
      aria-labelledby="tell-us"
      onSubmit={onSubmit}
      className="brand-card bg-cream p-5"
    >
      <h2 id="tell-us" className="font-display text-2xl text-navy">
        Tell us the plate
      </h2>
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="spot-jurisdiction" className="mb-1 block text-sm font-semibold">
            State or Province
          </label>
          <select
            id="spot-jurisdiction"
            name="jurisdiction"
            required
            defaultValue={values.jurisdiction ?? ""}
            aria-invalid={errors.jurisdiction ? true : undefined}
            aria-describedby={errors.jurisdiction ? "spot-jurisdiction-error" : undefined}
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
          <FieldError id="spot-jurisdiction-error" message={errors.jurisdiction} />
        </div>
        <div>
          <label htmlFor="spot-text" className="mb-1 block text-sm font-semibold">
            Plate text
          </label>
          <input
            id="spot-text"
            name="text"
            required
            defaultValue={values.text ?? ""}
            placeholder="e.g. B7K2L9"
            aria-invalid={errors.text ? true : undefined}
            aria-describedby={textDescribedBy}
            className="h-11 w-full rounded-lg border border-input bg-card px-3 uppercase placeholder:normal-case"
          />
          <p id="spot-text-limit" className="mt-1 text-sm text-muted-foreground">
            Up to 8 characters. Spaces and dashes are ignored
          </p>
          <FieldError id="spot-text-error" message={errors.text} />
        </div>
      </div>
      {isDemo && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          {DEMO_MESSAGE}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || isDemo}
        className="brand-btn brand-btn-coral mt-5 w-full sm:w-auto"
      >
        Check This Plate
      </button>
    </form>
  );
}

function WhatHappensNext() {
  return (
    <aside aria-labelledby="what-next" className="brand-card bg-cream-warm p-5">
      <h2 id="what-next" className="font-display text-2xl text-navy">
        What happens next?
      </h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5">
        <li>We check whether it's already here.</li>
        <li>If it's new, it joins as a mystery.</li>
        <li>You can add your story once it's live.</li>
      </ol>
    </aside>
  );
}

function RateLimitedOutcome() {
  return (
    <Outcome
      sign="Spot a Plate"
      heading="Let's pause a moment."
      actions={
        <Link to="/" className={outline}>
          Go Back
        </Link>
      }
    >
      <p role="status" className="text-lg">
        {RATE_LIMIT_MESSAGE}
      </p>
    </Outcome>
  );
}

function CheckingView() {
  return (
    <Outcome sign="Spot a Plate" heading="Checking the collection..." actions={null}>
      <Placeholder label="A travelling car with a magnifying glass">
        <Car aria-hidden className="spot-drive size-12" />
        <Search aria-hidden className="size-8" />
      </Placeholder>
      <p role="status" className="text-lg">
        Just a moment while we look.
      </p>
    </Outcome>
  );
}

function SpotResultView({ result }: { result: SpotResult }) {
  switch (result.outcome) {
    case "rate-limited":
      return <RateLimitedOutcome />;
    case "new":
      return (
        <Outcome
          sign="New to the collection"
          heading="A new mystery joins the collection!"
          actions={
            <>
              <Link
                to="/plate/$state"
                params={{ state: result.plate.id }}
                className="brand-btn brand-btn-coral"
              >
                Add the First Story
              </Link>
              <a href="/explore" className={outline}>
                Explore More Plates
              </a>
            </>
          }
        >
          <Plate jurisdiction={result.plate.jurisdiction} text={result.plate.text} size="md" />
          <p className="text-lg">Thanks for spotting this plate. You're the first to add it!</p>
        </Outcome>
      );
    case "exists":
      return (
        <Outcome
          sign="Already in the collection"
          heading="We already know this plate!"
          actions={
            <>
              <Link
                to="/plate/$state"
                params={{ state: result.plate.id }}
                className="brand-btn brand-btn-navy"
              >
                View This Plate
              </Link>
              <Link to="/spot" className={outline}>
                Spot Another Plate
              </Link>
            </>
          }
        >
          <Plate jurisdiction={result.plate.jurisdiction} text={result.plate.text} size="md" />
        </Outcome>
      );
    case "pending":
      return (
        <Outcome
          sign="Checking this one out..."
          heading="Your mystery is waiting in the wings!"
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
            Your plate is waiting for its safety check. You can see its status anytime in Your
            Submissions.
          </p>
        </Outcome>
      );
    case "rejected":
      return (
        <Outcome
          sign="Hmm... not this one."
          heading="We couldn't add this plate."
          actions={
            <>
              <Link to="/spot" className="brand-btn brand-btn-navy">
                Try Another Plate
              </Link>
              <a href="/explore" className={outline}>
                Back to Explore
              </a>
            </>
          }
        >
          <Sasquatch />
          <p className="text-lg">
            Our automated check couldn't approve this plate for the collection. Sometimes these
            checks get things wrong.
          </p>
        </Outcome>
      );
    default:
      return (
        <Outcome
          sign="Spot a Plate"
          heading="Hmm... something went wrong."
          actions={
            <>
              <Link to="/spot" className="brand-btn brand-btn-navy">
                Try Again
              </Link>
              <Link to="/" className={outline}>
                Go Back
              </Link>
            </>
          }
        >
          <Sasquatch />
          <p className="text-lg">
            We couldn't check this plate right now. Please try again in a few moments.
          </p>
        </Outcome>
      );
  }
}

type SpotStage = { kind: "form" } | { kind: "checking" } | { kind: "result"; result: SpotResult };

/** The live Spot a Plate flow: form, checking, then the real outcome. */
export function SpotLivePage({ values }: { values?: SpotValues | undefined }) {
  const auth = useAccountAuth();
  const spot = useServerFn(spotPlate);
  const [stage, setStage] = useState<SpotStage>({ kind: "form" });
  const [submittedValues, setSubmittedValues] = useState<{
    jurisdiction: string;
    text: string;
  }>();
  const isDemo = Boolean(auth?.account?.isDemo);
  async function onSpot(next: { jurisdiction: string; text: string }) {
    setSubmittedValues(next);
    setStage({ kind: "checking" });
    try {
      const result = await spot({ data: next });
      setStage({ kind: "result", result });
      if (result.outcome === "demo") await track("demo_write_refused", { action: "spot_plate" });
      const outcome =
        result.outcome === "already-spotted"
          ? "already_spotted"
          : result.outcome === "rate-limited"
            ? "rate_limited"
            : result.outcome === "new" ||
                result.outcome === "exists" ||
                result.outcome === "pending" ||
                result.outcome === "rejected"
              ? result.outcome
              : "error";
      await track("subject_spotted", { outcome });
    } catch {
      setStage({ kind: "result", result: { outcome: "error" } });
      await track("subject_spotted", { outcome: "error" });
    }
  }
  if (stage.kind === "checking") return <CheckingView />;
  if (stage.kind === "result" && stage.result.outcome !== "already-spotted")
    return <SpotResultView result={stage.result} />;
  return (
    <main>
      <ScenicHeader
        asHeading
        title="Spot a Plate"
        subtitle="Seen a curious plate? Add it to the collection and let the guessing begin."
      />
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start">
        <div className="space-y-4">
          <SpotForm values={submittedValues ?? values} isDemo={isDemo} onSpot={onSpot} />
          {stage.kind === "result" &&
            stage.result.outcome === "already-spotted" &&
            submittedValues && <AlreadySpottedPanel values={submittedValues} />}
        </div>
        <WhatHappensNext />
      </div>
    </main>
  );
}
