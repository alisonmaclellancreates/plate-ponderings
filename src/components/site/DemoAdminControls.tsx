import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useAccountAuth } from "@/lib/account-auth";
import { resetSeedData, fillMissingGuesses } from "@/lib/demo-admin.functions";
import { Button } from "@/components/ui/button";

export function DemoAdminControls() {
  const auth = useAccountAuth();
  const reset = useServerFn(resetSeedData);
  const fill = useServerFn(fillMissingGuesses);
  const cache = useQueryClient();
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!auth?.demoEnabled || !auth.account?.isAdmin || auth.account.isDemo) return null;
  async function run(resetRequested: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const result = resetRequested ? await reset({ data: { confirmation } }) : await fill();
      setMessage(result.message);
      if (result.outcome === "done") await cache.invalidateQueries();
    } catch {
      setMessage("We couldn't complete this action. Please retry.");
    } finally {
      setBusy(false);
      setStage(0);
      setConfirmation("");
    }
  }
  return <section className="mt-6" aria-label="Demo data">
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" disabled={busy} onClick={() => setStage(1)}>Reset seed data</Button>
      <Button variant="outline" disabled={busy} onClick={() => void run(false)}>Fill missing guesses</Button>
    </div>
    {message && <p role="status" className="mt-3">{message}</p>}
    <Dialog.Root open={stage !== 0} onOpenChange={(open) => { if (!open && !busy) { setStage(0); setConfirmation(""); } }}>
      <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-navy/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 text-navy shadow-lg">
          <Dialog.Title className="font-display text-2xl">Reset seed data?</Dialog.Title>
          <Dialog.Description className="mt-3">This replaces all contributor content and non-admin accounts with the demo scenario. Your admin and sample accounts are kept.</Dialog.Description>
          {stage === 2 && <label className="mt-4 block">Type RESET to confirm<input className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} /></label>}
          <div className="mt-6 flex gap-3">
            <Dialog.Close asChild><Button variant="outline" disabled={busy}>Cancel</Button></Dialog.Close>
            {stage === 1 ? <Button onClick={() => setStage(2)}>Continue</Button> : <Button disabled={busy || confirmation !== "RESET"} onClick={() => void run(true)}>Reset seed data</Button>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </section>;
}