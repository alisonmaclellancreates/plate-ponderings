import { Link } from "@tanstack/react-router";
import { ScenicHeader } from "@/components/site/SpotPlate";
import { BLOCKED_HANDLES, BLOCKING_EXPLANATION, DELETE_ACCOUNT_WARNING } from "@/lib/mock-data";

export function SettingsPage({ blocked = BLOCKED_HANDLES }: { blocked?: string[] }) {
  return (
    <main>
      <ScenicHeader asHeading title="Settings" subtitle="Your account, your call." />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <section aria-labelledby="blocked-people" className="brand-card p-6">
          <h2 id="blocked-people" className="font-display text-2xl text-navy">
            Blocked people
          </h2>
          <ul className="mt-4 space-y-3">
            {blocked.map((handle) => (
              <li key={handle} className="flex items-center justify-between gap-4">
                <span className="font-semibold">{handle}</span>
                <button type="button" className="brand-btn brand-btn-outline">
                  Unblock
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">{BLOCKING_EXPLANATION}</p>
        </section>
        <section aria-labelledby="delete-account" className="brand-card p-6">
          <h2 id="delete-account" className="font-display text-2xl text-navy">
            Delete account
          </h2>
          <p className="mt-3">{DELETE_ACCOUNT_WARNING}</p>
          <div className="mt-4">
            <Link
              to="/settings/delete-confirm"
              className="brand-btn brand-btn-outline-coral"
            >
              Delete My Account
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export function DeleteConfirmPage() {
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
            <button type="button" className="brand-btn brand-btn-coral">
              Delete Account
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
