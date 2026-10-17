import { Link } from "@tanstack/react-router";
import { CheckCircle2, TriangleAlert, ChevronRight, UserCircle2 } from "lucide-react";
import { Plate } from "@/components/site/Plate";
import { ModerationBadge } from "@/components/site/Badges";
import { ScenicHeader } from "@/components/site/SpotPlate";
import { StoryCard } from "@/components/site/PlateDetail";
import { CURRENT_USER, PROFILE_SAMPLE_STORY, SUBMISSIONS, type Submission } from "@/lib/mock-data";
import { formatDay } from "@/lib/format-day";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAccountAuth } from "@/lib/account-auth";
import { checkHandle, saveHandle } from "@/lib/accounts.functions";
import {
  handleFormatValid,
  handleValidationMessage,
  HANDLE_UNAVAILABLE,
  DEMO_MESSAGE,
} from "@/lib/account-rules";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

function RowAction({ row }: { row: Submission }) {
  if (row.action === "dismiss")
    return (
      <button type="button" className="brand-btn brand-btn-outline">
        Dismiss
      </button>
    );
  if (row.action === "view" && row.plateState)
    return (
      <Link
        to="/plate/$state"
        params={{ state: row.plateState }}
        className="brand-btn brand-btn-outline"
      >
        View Plate
      </Link>
    );
  if (row.action === "view")
    return (
      <button type="button" className="brand-btn brand-btn-outline">
        View Plate
      </button>
    );
  return null;
}

function SubmissionRow({ row }: { row: Submission }) {
  const opens = row.action === "view";
  return (
    <li
      data-testid="submission"
      className="brand-card grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.2fr)_auto]"
    >
      <Plate jurisdiction={row.jurisdiction} text={row.text} size="sm" className="w-24 sm:w-32" />
      <div className="min-w-0">
        <p className="font-semibold text-navy">
          {row.text}
          {row.updated && (
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              Updated
            </span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          {row.jurisdiction} · {row.kind === "plate" ? "Plate submission" : "Your story"} ·{" "}
          {formatDay(row.date)}
        </p>
        <div className="mt-2 space-y-1 sm:hidden">
          <ModerationBadge state={row.moderation} />
          <p className="text-sm">{row.explanation}</p>
          {row.action && (
            <div className="pt-1">
              <RowAction row={row} />
            </div>
          )}
        </div>
      </div>
      <div className="hidden min-w-0 space-y-1 sm:block">
        <ModerationBadge state={row.moderation} />
        <p className="text-sm">{row.explanation}</p>
      </div>
      <div className="flex justify-end">
        <span className="hidden sm:block">
          <RowAction row={row} />
        </span>
        {opens && (
          <ChevronRight
            aria-hidden
            data-testid="chevron"
            className="size-5 text-muted-foreground sm:hidden"
          />
        )}
      </div>
    </li>
  );
}

export function SubmissionsPage({ rows = SUBMISSIONS }: { rows?: Submission[] }) {
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <main>
      <ScenicHeader
        asHeading
        title="Your Submissions"
        subtitle="The plates you've spotted and the stories you've shared."
      />
      <ul className="mx-auto max-w-5xl space-y-3 px-4 py-8">
        {sorted.map((row) => (
          <SubmissionRow key={row.id} row={row} />
        ))}
      </ul>
    </main>
  );
}

export const HANDLE_HELP =
  "3-20 characters: letters, numbers, and underscores. Handles are unique (not case sensitive). Some names are reserved. We'll run a quick safety check when you save.";

/** Presentational handle field; previews render it inertly with a fixed state. */
export function HandleField({
  draft,
  available = false,
  message = "",
  busy = false,
  isDemo = false,
  onDraftChange,
  onSubmit,
}: {
  draft: string;
  available?: boolean;
  message?: string;
  busy?: boolean;
  isDemo?: boolean;
  onDraftChange?: (value: string) => void;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const uid = useId();
  const inputId = `handle-${uid}`;
  const statusId = `handle-status-${uid}`;
  const helpId = `handle-help-${uid}`;
  const messageId = `handle-message-${uid}`;
  const success = message === "Changes saved." ? message : "";
  const serverError = message && !success ? message : "";
  const validationError =
    !isDemo && !available && !handleFormatValid(draft) ? handleValidationMessage(draft) : "";
  const error = serverError || validationError;
  const describedBy = [
    available || isDemo ? statusId : "",
    error ? messageId : "",
    helpId,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <form
      className="min-w-0 flex-1 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(e);
      }}
    >
      <label htmlFor={inputId} className="block font-semibold text-navy">
        Handle
      </label>
      <input
        id={inputId}
        name="handle"
        value={draft}
        onChange={(e) => onDraftChange?.(e.target.value)}
        disabled={busy || isDemo}
        aria-describedby={describedBy}
        className="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2"
      />
      {available && (
        <span id={statusId} className="brand-badge w-fit" data-tone="green">
          <CheckCircle2 aria-hidden className="size-4 shrink-0" />
          Available
        </span>
      )}
      {isDemo && (
        <p id={statusId} className="text-sm text-muted-foreground">
          {DEMO_MESSAGE}
        </p>
      )}
      {error && (
        <p id={messageId} role="alert" className="flex items-start gap-1.5 text-coral-cta">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      <p id={helpId} className="text-sm text-muted-foreground">
        {HANDLE_HELP}
      </p>
      <div className="pt-2">
        <Button type="submit" disabled={busy || isDemo} className="brand-btn brand-btn-navy">
          Save Changes
        </Button>
      </div>
      {success && <p role="status">{success}</p>}
    </form>
  );
}

export function ProfilePage() {
  const auth = useAccountAuth();
  const handle = auth?.account?.handle ?? CURRENT_USER.handle;
  const [draft, setDraft] = useState(handle);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const check = useServerFn(checkHandle);
  const save = useServerFn(saveHandle);
  useEffect(() => {
    setDraft(handle);
  }, [handle]);
  useEffect(() => {
    setAvailable(false);
    if (!auth?.account || auth.account.isDemo || !handleFormatValid(draft)) return;
    let active = true;
    const timer = setTimeout(() => {
      void check({ data: { handle: draft } })
        .then((r) => {
          if (active) setAvailable(r.available);
        })
        .catch(() => {});
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [draft, auth?.account, check]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !auth?.account) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await save({ data: { handle: draft } });
      setMessage(result.message);
      if (result.outcome === "changed") {
        await auth.refresh();
        await track("handle_changed", {});
      } else if (result.outcome === "rejected") await track("handle_rejected", {});
    } catch {
      setMessage(HANDLE_UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <ScenicHeader
        asHeading
        title="Your Profile"
        subtitle="Tell us how you'd like to appear in the community."
      />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-start">
          <section aria-labelledby="profile-info" className="brand-card p-6">
            <h2 id="profile-info" className="font-display text-2xl text-navy">
              Profile Information
            </h2>
            <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
              <UserCircle2
                aria-hidden
                data-testid="profile-icon"
                className="size-24 shrink-0 text-muted-foreground"
              />
              <HandleField
                draft={draft}
                available={available}
                message={message}
                busy={busy}
                isDemo={Boolean(auth?.account?.isDemo)}
                onDraftChange={(value) => {
                  setDraft(value);
                  setMessage("");
                }}
                onSubmit={submit}
              />
            </div>
          </section>
          <aside className="brand-card -rotate-1 bg-cream-warm p-5 shadow-md">
            <p>Your handle appears with your stories and the plates you've spotted.</p>
          </aside>
        </div>
        <section aria-labelledby="how-appear">
          <h2 id="how-appear" className="font-display text-2xl text-navy">
            How you'll appear
          </h2>
          <article data-testid="sample-story" className="mt-3">
            <StoryCard story={{ ...PROFILE_SAMPLE_STORY, handle }} />
          </article>
        </section>
      </div>
    </main>
  );
}
