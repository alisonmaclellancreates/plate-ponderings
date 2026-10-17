import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const RECHECK_CAP = 10;

type RoleCtx = {
  supabase: {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "admin" },
    ) => PromiseLike<{
      data: boolean | null;
      error: unknown;
    }>;
  };
  userId: string;
};

/** Admin is decided by has_role through the caller's own client, never by the admin client. */
async function isAdmin(context: RoleCtx): Promise<boolean> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  return !error && data === true;
}

export const getAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ admin: boolean }> => ({
    admin: await isAdmin(context),
  }));

export type ReportedStoryRow = {
  id: string;
  jurisdiction: string;
  text: string;
  handle: string;
  meaning: string;
  reports: number;
  reasons: string[];
  status: "visible" | "hidden";
};

export const getReportedStories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReportedStoryRow[]> => {
    if (!(await isAdmin(context))) throw new Error("Admins only.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("get_reported_stories");
    if (error) throw new Error("We couldn't load reported stories.");
    return data.map((r) => ({
      id: r.story_id,
      jurisdiction: r.jurisdiction,
      text: r.plate_text,
      handle: r.handle,
      meaning: r.meaning,
      reports: r.report_count,
      reasons: r.reasons,
      status: r.status === "hidden" ? "hidden" : "visible",
    }));
  });

export type AdminResult = { outcome: "done" } | { outcome: "forbidden" } | { outcome: "error" };

/** Hide and unhide never touch published_at; both ask for a fresh summary. */
export const setStoryHidden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { storyId: string; hidden: boolean }) => ({
    storyId: typeof data.storyId === "string" ? data.storyId : "",
    hidden: data.hidden === true,
  }))
  .handler(async ({ data, context }): Promise<AdminResult> => {
    if (!(await isAdmin(context))) return { outcome: "forbidden" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const updated = await supabaseAdmin
      .from("stories")
      .update(
        data.hidden
          ? { status: "hidden", removed_at: new Date().toISOString() }
          : { status: "published", removed_at: null },
      )
      .eq("id", data.storyId)
      .eq("status", data.hidden ? "published" : "hidden")
      .select("subject_id");
    const row = updated.data?.[0];
    if (updated.error || !row) return { outcome: "error" };
    const { requestSummaryRefresh } = await import("./summary-refresh.server");
    const { runAfterResponse } = await import("./after-response.server");
    runAfterResponse(requestSummaryRefresh(row.subject_id));
    return { outcome: "done" };
  });

export type RecheckAllResult =
  | { outcome: "done"; changed: number; remaining: number; stopped: boolean }
  | { outcome: "paused" }
  | { outcome: "forbidden" }
  | { outcome: "error" };

/**
 * Rechecks everyone's pending plates then stories, oldest first, except the demo
 * account's: at most RECHECK_CAP per click, stopping on the first unavailable or block.
 */
export const recheckAllPending = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RecheckAllResult> => {
    if (!(await isAdmin(context))) return { outcome: "forbidden" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { readAiBlock } = await import("./ai-block.server");
    const block = await readAiBlock(supabaseAdmin);
    if (!block) return { outcome: "error" };
    if (block.category) return { outcome: "paused" };
    const demo = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "demo");
    if (demo.error) return { outcome: "error" };
    const demoIds = demo.data.map((d) => d.user_id);
    const notDemo = <T extends { owner: string | null }>(rows: T[]) =>
      rows.filter((r) => r.owner === null || !demoIds.includes(r.owner));
    const subjects = await supabaseAdmin
      .from("subjects")
      .select("id,identity_a,identity_b,created_by,jurisdictions!subjects_identity_a_fkey(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    const stories = await supabaseAdmin
      .from("stories")
      .select("id,subject_id,meaning,body,author_id,subjects!stories_subject_id_fkey(identity_b)")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (subjects.error || stories.error) return { outcome: "error" };
    const queue = [
      ...notDemo(subjects.data.map((s) => ({ kind: "subject" as const, owner: s.created_by, s }))),
      ...notDemo(stories.data.map((s) => ({ kind: "story" as const, owner: s.author_id, s }))),
    ];
    const { recheckSubject, recheckStory } = await import("./recheck.server");
    let changed = 0;
    let stopped = false;
    for (const item of queue.slice(0, RECHECK_CAP)) {
      const outcome =
        item.kind === "subject"
          ? await recheckSubject(
              supabaseAdmin,
              {
                ...item.s,
                name:
                  (item.s.jurisdictions as unknown as { name: string } | null)?.name ??
                  item.s.identity_a,
              },
              item.owner,
            )
          : await recheckStory(
              supabaseAdmin,
              {
                ...item.s,
                plateText:
                  (item.s.subjects as unknown as { identity_b: string } | null)?.identity_b ?? "",
              },
              item.owner,
            );
      if (outcome === "unavailable") {
        stopped = true;
        break;
      }
      changed++;
    }
    return { outcome: "done", changed, remaining: queue.length - changed, stopped };
  });
