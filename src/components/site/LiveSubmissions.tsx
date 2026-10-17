import { useEffect, useRef, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SubmissionsPage } from "@/components/site/Account";
import {
  dismissSubmission,
  getSubmissions,
  markSubmissionsRead,
} from "@/lib/submissions.functions";
import { SUBMISSIONS_KEY, UNREAD_DOT_KEY } from "@/lib/submissions-queries";
import type { Submission } from "@/lib/domain";
import { track } from "@/lib/analytics";

const DISMISS_ERROR = "We couldn't dismiss that right now. Please try again.";

/** Your Submissions with live rows; viewing marks notifications read (the server skips demo). */
export function LiveSubmissions() {
  const fetchRows = useServerFn(getSubmissions);
  const markRead = useServerFn(markSubmissionsRead);
  const dismiss = useServerFn(dismissSubmission);
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery({ queryKey: SUBMISSIONS_KEY, queryFn: () => fetchRows() });
  // Labels shown on this visit stay; the next visit reads the marked state.
  const [initial] = useState(data);
  const [gone, setGone] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    void track("submissions_viewed", { unread_count: initial.unreadCount });
    void markRead()
      .then(() => queryClient.invalidateQueries({ queryKey: UNREAD_DOT_KEY }))
      .catch(() => {});
  }, [initial.unreadCount, markRead, queryClient]);
  async function onDismiss(row: Submission) {
    setMessage("");
    try {
      const result = await dismiss({ data: { kind: row.kind, id: row.id } });
      if (result.outcome === "demo") {
        setMessage(result.message ?? "");
        void track("demo_write_refused", { action: "dismiss_submission" });
      } else setGone((g) => [...g, row.id]);
    } catch {
      setMessage(DISMISS_ERROR);
    }
  }
  return (
    <SubmissionsPage
      rows={initial.rows.filter((r) => !gone.includes(r.id))}
      onDismiss={(row) => void onDismiss(row)}
      message={message}
    />
  );
}
