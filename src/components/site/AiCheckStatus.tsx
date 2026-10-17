import { useEffect, useId, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { TriangleAlert } from "lucide-react";
import { getAiCheckStatus, resumeAiChecks } from "@/lib/accounts.functions";
import { useAccountAuth } from "@/lib/account-auth";
import { Button } from "@/components/ui/button";

export type AiCheckStatusValue = {
  allowed: boolean;
  category?: string | null;
  blockedAt?: string | null;
};

/** Presentational panel for the shared AI check status; previews render it inertly. */
export function AiCheckStatusPanel({
  status,
  busy = false,
  error = "",
  success = "",
  onResume,
}: {
  status: AiCheckStatusValue | null;
  busy?: boolean;
  error?: string;
  success?: string;
  onResume?: () => void;
}) {
  const blocked = Boolean(status?.category);
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="mt-6 border-y border-border py-5">
      <h2 id={headingId} className="font-display text-2xl text-navy">
        AI check status
      </h2>
      {!status ? (
        <p role="status" className="mt-2">
          Loading…
        </p>
      ) : blocked ? (
        <div className="mt-3 rounded-lg bg-coral-pale p-4 text-navy">
          <p className="flex items-center gap-2 font-display text-xl">
            <TriangleAlert aria-hidden data-testid="blocked-icon" className="size-5 shrink-0" />
            Blocked
          </p>
          <p className="mt-1">
            AI checks are paused. Nothing is published without a check. People keep their current
            handles.
          </p>
          {status?.blockedAt && (
            <p className="mt-1 text-sm">
              Paused since {new Date(status.blockedAt).toLocaleString()}
            </p>
          )}
          <Button disabled={busy} className="brand-btn brand-btn-navy mt-3" onClick={onResume}>
            Resume AI checks
          </Button>
        </div>
      ) : (
        <p role="status" className="mt-2">
          Ready
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mt-2">
          {success}
        </p>
      )}
    </section>
  );
}

export function AiCheckStatus() {
  const auth = useAccountAuth();
  const getStatus = useServerFn(getAiCheckStatus);
  const resume = useServerFn(resumeAiChecks);
  const [status, setStatus] = useState<AiCheckStatusValue | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    if (auth?.account?.isAdmin && !auth.account.isDemo)
      void getStatus()
        .then(setStatus)
        .catch(() => setError("Status couldn't be loaded."));
  }, [auth?.account, getStatus]);
  if (!auth?.account?.isAdmin || auth.account.isDemo) return null;
  return (
    <AiCheckStatusPanel
      status={status}
      busy={busy}
      error={error}
      success={success}
      onResume={async () => {
        setBusy(true);
        setError("");
        setSuccess("");
        try {
          const result = await resume();
          if (!result.resumed) {
            setError("AI checks couldn't be resumed.");
            return;
          }
          const next = await getStatus();
          setStatus(next);
          if (!next.category) setSuccess("AI checks resumed.");
        } catch {
          setError("AI checks couldn't be resumed.");
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
