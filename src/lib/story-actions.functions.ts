import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEMO_MESSAGE } from "./account-rules";

export const REPORT_REASON_KEYS = ["personal_info", "harassment", "spam", "other"] as const;
export type ReportReason = (typeof REPORT_REASON_KEYS)[number];
export const REPORT_NOTE_MAX = 200;

export type ActionResult =
  { outcome: "done" } | { outcome: "demo"; message: string } | { outcome: "error" };

const id = (data: { storyId: string }) => ({
  storyId: typeof data.storyId === "string" ? data.storyId : "",
});

type Ctx = {
  supabase: {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "demo" },
    ) => PromiseLike<{
      data: boolean | null;
      error: unknown;
    }>;
  };
  userId: string;
};

/** Demo is refused first, in the server; RLS refuses it again in the database. */
async function demoGate(context: Ctx): Promise<ActionResult | null> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "demo",
  });
  if (error) return { outcome: "error" };
  return data ? { outcome: "demo", message: DEMO_MESSAGE } : null;
}

export const toggleHeart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { storyId: string; hearted: boolean }) => ({
    ...id(data),
    hearted: data.hearted === true,
  }))
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const refused = await demoGate(context);
    if (refused) return refused;
    const result = data.hearted
      ? await context.supabase
          .from("hearts")
          .upsert(
            { story_id: data.storyId, user_id: context.userId },
            { onConflict: "story_id,user_id", ignoreDuplicates: true },
          )
      : await context.supabase
          .from("hearts")
          .delete()
          .eq("story_id", data.storyId)
          .eq("user_id", context.userId);
    return result.error ? { outcome: "error" } : { outcome: "done" };
  });

export type ReportResult = ActionResult | { outcome: "already" } | { outcome: "validation" };

export const reportStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { storyId: string; reason: string; note: string }) => ({
    ...id(data),
    reason: typeof data.reason === "string" ? data.reason : "",
    note: typeof data.note === "string" ? data.note.trim() : "",
  }))
  .handler(async ({ data, context }): Promise<ReportResult> => {
    const refused = await demoGate(context);
    if (refused) return refused;
    if (
      !(REPORT_REASON_KEYS as readonly string[]).includes(data.reason) ||
      data.note.length > REPORT_NOTE_MAX
    )
      return { outcome: "validation" };
    const inserted = await context.supabase.from("reports").insert({
      story_id: data.storyId,
      reporter_id: context.userId,
      reason: data.reason,
      note: data.note || null,
    });
    if (inserted.error?.code === "23505") return { outcome: "already" };
    return inserted.error ? { outcome: "error" } : { outcome: "done" };
  });

/** Block resolves the author from the story on the server; no author id reaches the browser. */
export const blockAuthor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(id)
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const refused = await demoGate(context);
    if (refused) return refused;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const story = await supabaseAdmin
      .from("stories")
      .select("author_id")
      .eq("id", data.storyId)
      .eq("status", "published")
      .maybeSingle();
    const author = story.data?.author_id;
    if (story.error || !author || author === context.userId) return { outcome: "error" };
    const inserted = await context.supabase
      .from("blocks")
      .upsert(
        { blocker_id: context.userId, blocked_id: author },
        { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
      );
    return inserted.error ? { outcome: "error" } : { outcome: "done" };
  });

export type BlockedPerson = { key: string; handle: string };

/** The caller's own block list. Keys are the blocked account ids, which only the blocker sees. */
export const getBlockedPeople = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BlockedPerson[]> => {
    const blocks = await context.supabase
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", context.userId)
      .order("created_at", { ascending: true });
    if (blocks.error) throw new Error("We couldn't load your blocked people.");
    const ids = blocks.data.map((b) => b.blocked_id);
    if (ids.length === 0) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const profiles = await supabaseAdmin.from("profiles").select("id,handle").in("id", ids);
    const handles = new Map((profiles.data ?? []).map((p) => [p.id, p.handle]));
    return ids.map((key) => ({ key, handle: handles.get(key) ?? "Traveler" }));
  });

export const unblockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { key: string }) => ({
    key: typeof data.key === "string" ? data.key : "",
  }))
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const refused = await demoGate(context);
    if (refused) return refused;
    const removed = await context.supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", context.userId)
      .eq("blocked_id", data.key);
    return removed.error ? { outcome: "error" } : { outcome: "done" };
  });

export const deleteMyStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(id)
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const refused = await demoGate(context);
    if (refused) return refused;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { tombstoneStories } = await import("./tombstone.server");
    const done = await tombstoneStories(supabaseAdmin, {
      ids: [data.storyId],
      authorId: context.userId,
    });
    return done === null || done.length === 0 ? { outcome: "error" } : { outcome: "done" };
  });
