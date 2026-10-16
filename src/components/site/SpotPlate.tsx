import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Car, MessageCircle, Search } from "lucide-react";
import { Plate } from "@/components/site/Plate";
import { ConsensusBadge } from "@/components/site/Badges";
import { JURISDICTION_GROUPS } from "@/lib/jurisdictions";
import { PLATES } from "@/lib/mock-data";
import { storyCount } from "@/lib/story-count";

export type SpotOutcome =
  | "validation"
  | "checking"
  | "exists"
  | "new"
  | "pending"
  | "rejected"
  | "already-spotted"
  | "error";

export const SPOT_OUTCOMES: Record<SpotOutcome, string> = {
  validation: "Missing details",
  checking: "Checking the collection",
  exists: "Plate already here",
  new: "New mystery",
  pending: "Waiting for its check",
  rejected: "Couldn't add this plate",
  "already-spotted": "Spotted already",
  error: "Something went wrong",
};

export interface SpotValues {
  jurisdiction?: string | undefined;
  text?: string | undefined;
}
export interface SpotErrors {
  jurisdiction?: string | undefined;
  text?: string | undefined;
}

export const JURISDICTION_ERROR = "Please select a state or province";
export const TEXT_EMPTY_ERROR = "Please enter the plate text";
export const TEXT_ERROR = "Plates can use letters, numbers, spaces, and dashes";
export const TEXT_LENGTH_ERROR = "Plates can be up to 8 characters, not counting spaces and dashes";

/** Letters, numbers, spaces and dashes; up to 8 characters once spaces and dashes are removed. */
export function validateSpot(values: SpotValues): SpotErrors {
  const errors: SpotErrors = {};
  if (!values.jurisdiction) errors.jurisdiction = JURISDICTION_ERROR;
  const raw = (values.text ?? "").trim();
  const compact = raw.replace(/[\s-]/g, "");
  if (!raw) errors.text = TEXT_EMPTY_ERROR;
  else if (!/^[A-Za-z0-9\s-]*$/.test(raw)) errors.text = TEXT_ERROR;
  else if (compact.length > 8) errors.text = TEXT_LENGTH_ERROR;
  else if (!compact) errors.text = TEXT_EMPTY_ERROR;
  return errors;
}

function plateBySlug(slug: string) {
  return PLATES.find((p) => p.slug === slug)!;
}

/** Rowan's signpost as decoration beside the sign's live text on a cream surface. */
function ScenicHeader({
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
function Outcome({
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
}: {
  values?: SpotValues | undefined;
  errors?: SpotErrors | undefined;
}) {
  const [errors, setErrors] = useState<SpotErrors>(initialErrors);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setErrors(
      validateSpot({
        jurisdiction: String(data.get("jurisdiction") ?? ""),
        text: String(data.get("text") ?? ""),
      }),
    );
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
      <button type="submit" className="brand-btn brand-btn-coral mt-5 w-full sm:w-auto">
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

function AlreadySpottedPanel({ values }: { values: Required<SpotValues> }) {
  return (
    <section
      aria-labelledby="already-spotted"
      data-testid="roadside-sign"
      className="rounded-lg border-4 border-teal bg-card p-5 text-center"
    >
      <h2 id="already-spotted" className="font-display text-2xl text-teal">
        Someone spotted this one already!
      </h2>
      <p className="mt-2">
        This plate has been submitted and is waiting for its check. Try looking again soon.
      </p>
      <Link
        to="/"
        search={{ jurisdiction: values.jurisdiction, text: values.text }}
        className="brand-btn brand-btn-navy mt-4"
      >
        Back to Search
      </Link>
    </section>
  );
}

export function SpotPage({
  values,
  errors,
  alreadySpotted,
}: {
  values?: SpotValues | undefined;
  errors?: SpotErrors | undefined;
  alreadySpotted?: boolean;
}) {
  return (
    <main>
      <ScenicHeader
        asHeading
        title="Spot a Plate"
        subtitle="Seen a curious plate? Add it to the collection and let the guessing begin."
      />
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start">
        <div className="space-y-4">
          <SpotForm values={values} errors={errors} />
          {alreadySpotted && values?.jurisdiction && values.text && (
            <AlreadySpottedPanel
              values={{ jurisdiction: values.jurisdiction, text: values.text }}
            />
          )}
        </div>
        <WhatHappensNext />
      </div>
    </main>
  );
}

function ExistsStrip() {
  const plate = plateBySlug("bc-lv2code");
  const owner = plate.stories.find((s) => s.howIKnow === "owner");
  return (
    <ul
      aria-label="Plate status"
      className="flex flex-wrap items-center justify-center gap-y-2 divide-x divide-border rounded-xl border border-border bg-card py-2 text-sm"
    >
      <li className="flex items-center gap-1 px-3 font-semibold">
        <MessageCircle aria-hidden className="size-4" />
        {storyCount(plate.stories.length)}
      </li>
      {plate.summaries[0] && (
        <li className="px-3">
          <ConsensusBadge consensus={plate.summaries[0].consensus} />
        </li>
      )}
      <li className="px-3 font-semibold">{owner ? `Owner: ${owner.handle}` : "No owner yet"}</li>
    </ul>
  );
}

export function SpotOutcomePage({ outcome }: { outcome: SpotOutcome }) {
  switch (outcome) {
    case "validation":
      return (
        <SpotPage
          values={{ text: "HI@@!" }}
          errors={{ jurisdiction: JURISDICTION_ERROR, text: TEXT_ERROR }}
        />
      );
    case "already-spotted":
      return <SpotPage values={{ jurisdiction: "Utah", text: "TRAILS" }} alreadySpotted />;
    case "checking":
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
    case "exists": {
      const plate = plateBySlug("bc-lv2code");
      return (
        <Outcome
          sign="Already in the collection"
          heading="We already know this plate!"
          actions={
            <>
              <Link
                to="/plate/$state"
                params={{ state: "interpreted" }}
                className="brand-btn brand-btn-navy"
              >
                View This Plate
              </Link>
              <button type="button" className={outline}>
                Add Your Story
              </button>
            </>
          }
          footer={
            <Link to="/spot" className="font-semibold text-navy underline underline-offset-4">
              Back to Spot a Plate
            </Link>
          }
        >
          <Plate jurisdiction={plate.jurisdiction} text={plate.text} size="md" />
          <ExistsStrip />
        </Outcome>
      );
    }
    case "new": {
      const plate = plateBySlug("wa-b7k2l9");
      return (
        <Outcome
          sign="New to the collection"
          heading="A new mystery joins the collection!"
          actions={
            <>
              <Link
                to="/plate/$state"
                params={{ state: "mystery" }}
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
          <Plate jurisdiction={plate.jurisdiction} text={plate.text} size="md" />
          <p className="text-lg">Thanks for spotting this plate. You're the first to add it!</p>
        </Outcome>
      );
    }
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
    case "error":
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
