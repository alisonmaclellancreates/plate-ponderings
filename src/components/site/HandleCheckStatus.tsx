import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { TriangleAlert } from "lucide-react";
import { getHandleCheckStatus, resumeHandleChecks } from "@/lib/accounts.functions";
import { useAccountAuth } from "@/lib/account-auth";
import { Button } from "@/components/ui/button";

export type HandleCheckStatusValue = {
  allowed: boolean;
  category?: string | null;
  blockedAt?: string | null;
};

/** Presentational panel for the handle check status; previews render it inertly. */
export function HandleCheckStatusPanel({
  status,
  busy = false,
  error = "",
  success = "",
  onResume,
}: {
  status: HandleCheckStatusValue | null;
  busy?: boolean;
  error?: string;
  success?: string;
  onResume?: () => void;
}) {
  const blocked = Boolean(status?.category);
  return (
    <section aria-labelledby="handle-check-status" className="mt-6 border-y border-border py-5">
      <h2 id="handle-check-status" className="font-display text-2xl text-navy">
        Handle check status
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
          <p className="mt-1">Handle checks are paused. People can keep their current handles.</p>
          {status?.blockedAt && (
            <p className="mt-1 text-sm">{new Date(status.blockedAt).toLocaleString()}</p>
          )}
          <Button disabled={busy} className="brand-btn brand-btn-navy mt-3" onClick={onResume}>
            Resume handle checks
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

export function HandleCheckStatus() {
  const auth = useAccountAuth();
  const getStatus = useServerFn(getHandleCheckStatus);
  const resume = useServerFn(resumeHandleChecks);
  const [status, setStatus] = useState<HandleCheckStatusValue | null>(null);
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
    <HandleCheckStatusPanel
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
            setError("Handle checks couldn't be resumed.");
            return;
          }
          const next = await getStatus();
          setStatus(next);
          if (!next.category) setSuccess("Handle checks resumed.");
        } catch {
          setError("Handle checks couldn't be resumed.");
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
