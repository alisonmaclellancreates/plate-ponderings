import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getHandleCheckStatus, resumeHandleChecks } from "@/lib/accounts.functions";
import { useAccountAuth } from "@/lib/account-auth";
import { Button } from "@/components/ui/button";
type Status = { allowed: boolean; category?: string | null; blockedAt?: string | null };
export function HandleCheckStatus() {
  const auth = useAccountAuth();
  const getStatus = useServerFn(getHandleCheckStatus);
  const resume = useServerFn(resumeHandleChecks);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (auth?.account?.isAdmin && !auth.account.isDemo)
      void getStatus()
        .then(setStatus)
        .catch(() => setError("Status couldn't be loaded."));
  }, [auth?.account, getStatus]);
  if (!auth?.account?.isAdmin || auth.account.isDemo) return null;
  return (
    <section aria-labelledby="handle-check-status" className="mt-6 border-y border-border py-5">
      <h2 id="handle-check-status" className="font-display text-2xl text-navy">
        Handle check status
      </h2>
      <p role="status" className="mt-2">
        {status?.allowed ? (status.category ? `Blocked: ${status.category}` : "Ready") : "Loading…"}
      </p>
      {status?.blockedAt && (
        <p className="mt-1 text-sm">{new Date(status.blockedAt).toLocaleString()}</p>
      )}
      {status?.category && (
        <Button
          disabled={busy}
          className="brand-btn brand-btn-navy mt-3"
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const result = await resume();
              if (!result.resumed) {
                setError("Handle checks couldn't be resumed.");
                return;
              }
              setStatus(await getStatus());
            } catch {
              setError("Handle checks couldn't be resumed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Resume handle checks
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-2">
          {error}
        </p>
      )}
    </section>
  );
}
