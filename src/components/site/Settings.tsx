import { Link } from "@tanstack/react-router";
import { ScenicHeader } from "@/components/site/SpotViews";
import { BLOCKING_EXPLANATION, DELETE_ACCOUNT_WARNING } from "@/lib/domain";

export type BlockedEntry = { key: string; handle: string };

export function SettingsPage({
  blocked = [],
  onUnblock,
  busy = false,
  message = "",
}: {
  blocked?: BlockedEntry[];
  onUnblock?: (entry: BlockedEntry) => void;
  busy?: boolean;
  message?: string;
}) {
  return (
    <main>
      <ScenicHeader asHeading title="Settings" subtitle="Your account, your call." />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <section aria-labelledby="blocked-people" className="brand-card p-6">
          <h2 id="blocked-people" className="font-display text-2xl text-navy">
            Blocked people
          </h2>
          <ul className="mt-4 space-y-3">
            {blocked.map((entry) => (
              <li key={entry.key} className="flex items-center justify-between gap-4">
                <span className="font-semibold">{entry.handle}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onUnblock?.(entry)}
                  className="brand-btn brand-btn-outline"
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
          {message && (
            <p role="alert" className="mt-4">
              {message}
            </p>
          )}
          <p className="mt-4 text-sm text-muted-foreground">{BLOCKING_EXPLANATION}</p>
        </section>
        <section aria-labelledby="delete-account" className="brand-card p-6">
          <h2 id="delete-account" className="font-display text-2xl text-navy">
            Delete account
          </h2>
          <p className="mt-3">{DELETE_ACCOUNT_WARNING}</p>
          <div className="mt-4">
            <Link to="/settings/delete-confirm" className="brand-btn brand-btn-outline-coral">
              Delete My Account
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export function DeleteConfirmPage({
  onDelete,
  busy = false,
  message = "",
}: {
  onDelete?: () => void;
  busy?: boolean;
  message?: string;
}) {
  return (
    <main>
      <ScenicHeader asHeading title="Settings" subtitle="Your account, your call." />
      <div className="mx-auto max-w-xl px-4 py-8">
        <section aria-labelledby="delete-confirm" className="brand-card p-6 text-center">
          <h2 id="delete-confirm" className="font-display text-2xl text-navy">
            Delete your account?
          </h2>
          <p className="mt-3">{DELETE_ACCOUNT_WARNING}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/settings" className="brand-btn brand-btn-navy">
              Keep My Account
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className="brand-btn brand-btn-coral"
            >
              Delete Account
            </button>
          </div>
          {message && (
            <p role="alert" className="mt-4">
              {message}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
