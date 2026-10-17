import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DeleteConfirmPage, SettingsPage, type BlockedEntry } from "@/components/site/Settings";
import { getBlockedPeople, unblockUser } from "@/lib/story-actions.functions";
import { deleteAccount } from "@/lib/account-delete.functions";
import { reset, track } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";

export const BLOCKED_KEY = ["blocked-people"] as const;
export const SETTINGS_ERROR = "Something went wrong. Please try again.";

export function LiveSettings() {
  const fetchBlocked = useServerFn(getBlockedPeople);
  const unblock = useServerFn(unblockUser);
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery({ queryKey: BLOCKED_KEY, queryFn: () => fetchBlocked() });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function onUnblock(entry: BlockedEntry) {
    setBusy(true);
    setMessage("");
    try {
      const result = await unblock({ data: { key: entry.key } });
      if (result.outcome === "demo") {
        setMessage(result.message);
        void track("demo_write_refused", { action: "unblock" });
      } else if (result.outcome === "error") setMessage(SETTINGS_ERROR);
      else {
        void track("user_unblocked", {});
        await queryClient.invalidateQueries({ queryKey: BLOCKED_KEY });
      }
    } catch {
      setMessage(SETTINGS_ERROR);
    }
    setBusy(false);
  }
  return (
    <SettingsPage
      blocked={data}
      busy={busy}
      message={message}
      onUnblock={(entry) => void onUnblock(entry)}
    />
  );
}

/** Second confirmation: deletes, then sends account_deleted, resets analytics and signs out. */
export function LiveDeleteConfirm() {
  const remove = useServerFn(deleteAccount);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function onDelete() {
    setBusy(true);
    setMessage("");
    try {
      const result = await remove();
      if (result.outcome === "demo") {
        setMessage(result.message);
        void track("demo_write_refused", { action: "delete_account" });
      } else if (result.outcome === "error") setMessage(SETTINGS_ERROR);
      else {
        await track("account_deleted", {});
        await reset();
        queryClient.clear();
        await supabase.auth.signOut({ scope: "local" });
        await navigate({ to: "/", replace: true });
        return;
      }
    } catch {
      setMessage(SETTINGS_ERROR);
    }
    setBusy(false);
  }
  return <DeleteConfirmPage busy={busy} message={message} onDelete={() => void onDelete()} />;
}
