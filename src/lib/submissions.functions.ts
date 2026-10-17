import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEMO_MESSAGE } from "./account-rules";
import type { Submission } from "./domain";

export const SUBMISSION_PENDING = "Waiting for its check. We'll let you know when it's ready.";
export const STORY_REJECTED_LINE = "We couldn't add your story.";
export const PLATE_REJECTED_LINE = "We couldn't add your plate.";
export const STORY_PHOTO_BUCKET = "story-photos";

type Status = "published" | "pending" | "rejected";
type Joined = { identity_b: string; status: string; jurisdictions: { name: string } | null };
export type SubjectRow = {
  id: string;
  identity_b: string;
  status: Status;
  created_at: string;
  jurisdictions: { name: string } | null;
};
export type StoryRow = {
  id: string;
  subject_id: string;
  status: Status;
  created_at: string;
  subjects: Joined | null;
};
export type Unread = { subject_id: string | null; story_id: string | null };
export type SubmissionsResult = { rows: Submission[]; unreadCount: number };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Merges own subjects and stories into the existing Submission row shape, newest first. */
export function buildSubmissions(
  subjects: SubjectRow[],
  stories: StoryRow[],
  storyCounts: Map<string, number>,
  heartCounts: Map<string, number>,
  unread: Unread[],
): SubmissionsResult {
  const unreadStories = new Set(unread.flatMap((n) => (n.story_id ? [n.story_id] : [])));
  const unreadSubjects = new Set(
    unread.flatMap((n) => (!n.story_id && n.subject_id ? [n.subject_id] : [])),
  );
  const fromSubjects = subjects.map((s) => ({
    at: s.created_at,
    row: {
      id: s.id,
      jurisdiction: s.jurisdictions?.name ?? "",
      text: s.identity_b.toUpperCase(),
      kind: "plate" as const,
      date: s.created_at.slice(0, 10),
      moderation: s.status,
      explanation:
        s.status === "published"
          ? `This plate is live with ${plural(storyCounts.get(s.id) ?? 0, "story", "stories")}.`
          : s.status === "pending"
            ? SUBMISSION_PENDING
            : PLATE_REJECTED_LINE,
      plateState: s.status === "published" ? s.id : undefined,
      action: s.status === "published" ? "view" : s.status === "rejected" ? "dismiss" : null,
      updated: unreadSubjects.has(s.id),
    } satisfies Submission,
  }));
  const fromStories = stories.map((st) => {
    const plateLive = st.subjects?.status === "published";
    const opens = st.status !== "rejected" && plateLive;
    return {
      at: st.created_at,
      row: {
        id: st.id,
        jurisdiction: st.subjects?.jurisdictions?.name ?? "",
        text: (st.subjects?.identity_b ?? "").toUpperCase(),
        kind: "story" as const,
        date: st.created_at.slice(0, 10),
        moderation: st.status,
        explanation:
          st.status === "published"
            ? `Your story is live and has ${plural(heartCounts.get(st.id) ?? 0, "heart", "hearts")}.`
            : st.status === "pending"
              ? SUBMISSION_PENDING
              : STORY_REJECTED_LINE,
        plateState: opens ? st.subject_id : undefined,
        action: st.status === "rejected" ? "dismiss" : opens ? "view" : null,
        updated: unreadStories.has(st.id),
      } satisfies Submission,
    };
  });
  const rows = [...fromSubjects, ...fromStories]
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((r) => r.row);
  return { rows, unreadCount: unread.length };
}

const tally = (ids: string[]) => {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
};

const READ_ERROR = "We couldn't load your submissions right now.";

export const getSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SubmissionsResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [subjects, stories, unread] = await Promise.all([
      supabaseAdmin
        .from("subjects")
        .select("id,identity_b,status,created_at,jurisdictions(name)")
        .eq("created_by", context.userId)
        .in("status", ["published", "pending", "rejected"]),
      supabaseAdmin
        .from("stories")
        .select(
          "id,subject_id,status,created_at,subjects!stories_subject_id_fkey(identity_b,status,jurisdictions(name))",
        )
        .eq("author_id", context.userId)
        .in("status", ["published", "pending", "rejected"]),
      supabaseAdmin
        .from("notifications")
        .select("subject_id,story_id")
        .eq("user_id", context.userId)
        .is("read_at", null),
    ]);
    if (subjects.error || stories.error || unread.error) throw new Error(READ_ERROR);
    const subjectRows = subjects.data as unknown as SubjectRow[];
    const storyRows = stories.data as unknown as StoryRow[];
    const publishedSubjects = subjectRows.filter((s) => s.status === "published").map((s) => s.id);
    const publishedStories = storyRows.filter((s) => s.status === "published").map((s) => s.id);
    const [counts, hearts] = await Promise.all([
      supabaseAdmin
        .from("stories")
        .select("subject_id")
        .in("subject_id", publishedSubjects)
        .eq("status", "published"),
      supabaseAdmin.from("hearts").select("story_id").in("story_id", publishedStories),
    ]);
    if (counts.error || hearts.error) throw new Error(READ_ERROR);
    return buildSubmissions(
      subjectRows,
      storyRows,
      tally(counts.data.map((r) => r.subject_id)),
      tally(hearts.data.map((r) => r.story_id)),
      unread.data,
    );
  });

export const getUnreadDot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .is("read_at", null);
    return { unread: !error && (count ?? 0) > 0 };
  });

export const markSubmissionsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: demo, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "demo",
    });
    if (error || demo) return { marked: false };
    const result = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    return { marked: !result.error };
  });

export type DismissResult = { outcome: "dismissed" | "not_found" | "demo"; message?: string };

export const dismissSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { kind: "plate" | "story"; id: string }) => ({
    kind: data.kind === "plate" ? ("plate" as const) : ("story" as const),
    id: String(data.id),
  }))
  .handler(async ({ data, context }): Promise<DismissResult> => {
    const { data: demo, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "demo",
    });
    if (roleError || demo) return { outcome: "demo", message: DEMO_MESSAGE };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.kind === "plate") {
      const deleted = await supabaseAdmin
        .from("subjects")
        .delete()
        .eq("id", data.id)
        .eq("created_by", context.userId)
        .eq("status", "rejected")
        .select("id");
      return { outcome: deleted.data?.length ? "dismissed" : "not_found" };
    }
    const deleted = await supabaseAdmin
      .from("stories")
      .delete()
      .eq("id", data.id)
      .eq("author_id", context.userId)
      .eq("status", "rejected")
      .select("id,photo_path");
    const row = deleted.data?.[0];
    if (!row) return { outcome: "not_found" };
    // Notifications go with the row (on delete cascade); the photo is removed only after a delete.
    if (row.photo_path)
      await supabaseAdmin.storage.from(STORY_PHOTO_BUCKET).remove([row.photo_path]);
    return { outcome: "dismissed" };
  });
