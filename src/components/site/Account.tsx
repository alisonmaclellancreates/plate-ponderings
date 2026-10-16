import { Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, UserCircle2 } from "lucide-react";
import { Plate } from "@/components/site/Plate";
import { ModerationBadge } from "@/components/site/Badges";
import { ScenicHeader } from "@/components/site/SpotPlate";
import { CURRENT_USER, PROFILE_SAMPLE_STORY, SUBMISSIONS, type Submission } from "@/lib/mock-data";

const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

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

export function ProfilePage() {
  const handle = CURRENT_USER.handle;
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
              <form className="min-w-0 flex-1 space-y-2" onSubmit={(e) => e.preventDefault()}>
                <label htmlFor="handle" className="block font-semibold text-navy">
                  Handle
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    id="handle"
                    name="handle"
                    defaultValue={handle}
                    aria-describedby="handle-status handle-help"
                    className="min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2"
                  />
                  <span id="handle-status" className="brand-badge" data-tone="green">
                    <CheckCircle2 aria-hidden className="size-4 shrink-0" />
                    Available
                  </span>
                </div>
                <p id="handle-help" className="text-sm text-muted-foreground">
                  {HANDLE_HELP}
                </p>
                <div className="pt-2">
                  <button type="submit" className="brand-btn brand-btn-navy">
                    Save Changes
                  </button>
                </div>
              </form>
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
          <article data-testid="sample-story" className="brand-card mt-3 flex gap-4 p-4">
            <UserCircle2 aria-hidden className="size-10 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-semibold">{handle}</span>{" "}
                <span className="text-muted-foreground">
                  · {formatDay(PROFILE_SAMPLE_STORY.date)}
                </span>
              </p>
              <p className="mt-1">{PROFILE_SAMPLE_STORY.text}</p>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
