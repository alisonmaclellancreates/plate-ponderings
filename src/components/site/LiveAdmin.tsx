import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPage } from "@/components/site/Admin";
import { getReportedStories, recheckAllPending, setStoryHidden } from "@/lib/admin.functions";
import type { ReportedStory } from "@/lib/domain";
import { track } from "@/lib/analytics";
import { ADMIN_ERROR, ADMIN_REPORTS_KEY, RECHECK_PAUSED, recheckNote } from "@/lib/admin-copy";
import { DemoAdminControls } from "./DemoAdminControls";

/** Admin with live reported stories; every action is verified as admin on the server. */
export function LiveAdmin() {
  const fetchRows = useServerFn(getReportedStories);
  const toggle = useServerFn(setStoryHidden);
  const recheck = useServerFn(recheckAllPending);
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery({ queryKey: ADMIN_REPORTS_KEY, queryFn: () => fetchRows() });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  async function onToggle(row: ReportedStory) {
    setBusy(true);
    setMessage("");
    const hidden = row.status === "visible";
    try {
      const result = await toggle({ data: { storyId: row.id, hidden } });
      if (result.outcome === "done") {
        void track("admin_action", { action: hidden ? "hide" : "unhide" });
        await queryClient.invalidateQueries({ queryKey: ADMIN_REPORTS_KEY });
      } else setMessage(ADMIN_ERROR);
    } catch {
      setMessage(ADMIN_ERROR);
    }
    setBusy(false);
  }
  async function onRecheck() {
    setBusy(true);
    setMessage("");
    try {
      const result = await recheck();
      if (result.outcome === "done") {
        setNote(recheckNote(result.changed, result.remaining, result.stopped));
        void track("admin_action", { action: "recheck" });
      } else setMessage(result.outcome === "paused" ? RECHECK_PAUSED : ADMIN_ERROR);
    } catch {
      setMessage(ADMIN_ERROR);
    }
    setBusy(false);
  }
  return (
    <AdminPage
      rows={data}
      demoControls={<DemoAdminControls />}
      busy={busy}
      note={note}
      message={message}
      onToggle={(row) => void onToggle(row)}
      onRecheck={() => void onRecheck()}
    />
  );
}
