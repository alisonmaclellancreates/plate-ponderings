import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateSpot } from "./spot";
import { plateKey } from "./plates";
import { DEMO_MESSAGE, RATE_LIMIT_MESSAGE } from "./account-rules";

export type PlateSummary = {
  id: string;
  jurisdiction: string;
  text: string;
};

export type SearchResult =
  { status: "found"; plate: PlateSummary } | { status: "no-match" } | { status: "error" };

type SpotInput = { jurisdiction: string; text: string };

const spotInput = (data: SpotInput): SpotInput => ({
  jurisdiction: typeof data.jurisdiction === "string" ? data.jurisdiction : "",
  text: typeof data.text === "string" ? data.text : "",
});

/** Maps a jurisdiction display name to its code, via the server's access. */
async function jurisdictionCode(
  admin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  name: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("jurisdictions")
    .select("code")
    .eq("name", name)
    .maybeSingle();
  if (error || !data) return null;
  return data.code;
}

async function publishedPlateByKey(
  admin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  key: string,
): Promise<PlateSummary | null | "error"> {
  const { data, error } = await admin
    .from("subjects")
    .select("id,identity_a,identity_b,jurisdictions!subjects_identity_a_fkey(name)")
    .eq("normalized_key", key)
    .eq("status", "published")
    .maybeSingle();
  if (error) return "error";
  if (!data) return null;
  const joined = data.jurisdictions as unknown as { name: string } | null;
  return { id: data.id, jurisdiction: joined?.name ?? data.identity_a, text: data.identity_b };
}

export const searchPlate = createServerFn({ method: "POST" })
  .inputValidator(spotInput)
  .handler(async ({ data }): Promise<SearchResult> => {
    if (Object.keys(validateSpot(data)).length > 0) return { status: "no-match" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = await jurisdictionCode(supabaseAdmin, data.jurisdiction);
    if (!code) return { status: "error" };
    const plate = await publishedPlateByKey(supabaseAdmin, plateKey(code, data.text));
    if (plate === "error") return { status: "error" };
    if (!plate) return { status: "no-match" };
    return { status: "found", plate };
  });

export const getPlate = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => ({ id: typeof data.id === "string" ? data.id : "" }))
  .handler(async ({ data }): Promise<{ plate: PlateSummary | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("subjects")
      .select("id,identity_a,identity_b,jurisdictions!subjects_identity_a_fkey(name)")
      .eq("id", data.id)
      .eq("status", "published")
      .maybeSingle();
    if (error || !row) return { plate: null };
    const joined = row.jurisdictions as unknown as { name: string } | null;
    return {
      plate: { id: row.id, jurisdiction: joined?.name ?? row.identity_a, text: row.identity_b },
    };
  });

export type SpotResult =
  | { outcome: "new"; plate: PlateSummary }
  | { outcome: "exists"; plate: PlateSummary }
  | { outcome: "pending" }
  | { outcome: "rejected" }
  | { outcome: "already-spotted" }
  | { outcome: "rate-limited"; message: string }
  | { outcome: "demo"; message: string }
  | { outcome: "validation" }
  | { outcome: "error" };

/** What is now true for a normalized key, after a lookup or an insert conflict. */
async function existingOutcome(
  admin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  key: string,
  userId: string,
): Promise<SpotResult | null> {
  const { data, error } = await admin
    .from("subjects")
    .select(
      "id,identity_a,identity_b,status,created_by,jurisdictions!subjects_identity_a_fkey(name)",
    )
    .eq("normalized_key", key)
    .in("status", ["pending", "published"])
    .maybeSingle();
  if (error) return { outcome: "error" };
  if (!data) return null;
  const joined = data.jurisdictions as unknown as { name: string } | null;
  const plate: PlateSummary = {
    id: data.id,
    jurisdiction: joined?.name ?? data.identity_a,
    text: data.identity_b,
  };
  if (data.status === "published") return { outcome: "exists", plate };
  if (data.created_by === userId) return { outcome: "pending" };
  return { outcome: "already-spotted" };
}

export const spotPlate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(spotInput)
  .handler(async ({ data, context }): Promise<SpotResult> => {
    const { data: demo, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "demo",
    });
    if (roleError) return { outcome: "error" };
    if (demo) return { outcome: "demo", message: DEMO_MESSAGE };
    if (Object.keys(validateSpot(data)).length > 0) return { outcome: "validation" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = await jurisdictionCode(supabaseAdmin, data.jurisdiction);
    if (!code) return { outcome: "error" };
    const key = plateKey(code, data.text);
    const existing = await existingOutcome(supabaseAdmin, key, context.userId);
    if (existing) return existing;
    const attempt = await supabaseAdmin.rpc("consume_subject_save_attempt", {
      _user_id: context.userId,
    });
    if (attempt.error) return { outcome: "error" };
    if (!attempt.data) return { outcome: "rate-limited", message: RATE_LIMIT_MESSAGE };
    const { readAiBlock, persistAiBlock } = await import("./ai-block.server");
    const block = await readAiBlock(supabaseAdmin);
    if (!block) return { outcome: "error" };
    const insertPending = async (): Promise<SpotResult> => {
      const inserted = await supabaseAdmin.from("subjects").insert({
        identity_a: code,
        identity_b: data.text.trim(),
        normalized_key: key,
        status: "pending",
        created_by: context.userId,
      });
      if (inserted.error) {
        // A simultaneous spot may have inserted the same key first.
        if (inserted.error.code === "23505") {
          const now = await existingOutcome(supabaseAdmin, key, context.userId);
          return now ?? { outcome: "error" };
        }
        return { outcome: "error" };
      }
      return { outcome: "pending" };
    };
    if (block.category) return insertPending();
    const { checkSubject } = await import("./plate-moderation.server");
    const result = await checkSubject(data.jurisdiction, data.text);
    if (result.block) await persistAiBlock(supabaseAdmin, result.block, result.runId);
    if (result.outcome === "unavailable") return insertPending();
    if (result.outcome === "rejected") return { outcome: "rejected" };
    const inserted = await supabaseAdmin
      .from("subjects")
      .insert({
        identity_a: code,
        identity_b: data.text.trim(),
        normalized_key: key,
        status: "published",
        created_by: context.userId,
        published_at: new Date().toISOString(),
      })
      .select("id,identity_b")
      .single();
    if (inserted.error) {
      if (inserted.error.code === "23505") {
        const now = await existingOutcome(supabaseAdmin, key, context.userId);
        return now ?? { outcome: "error" };
      }
      return { outcome: "error" };
    }
    const { requestPlateGuess } = await import("./plate-guesses.server");
    const { runAfterResponse } = await import("./after-response.server");
    runAfterResponse(requestPlateGuess(inserted.data.id));
    return {
      outcome: "new",
      plate: {
        id: inserted.data.id,
        jurisdiction: data.jurisdiction,
        text: inserted.data.identity_b,
      },
    };
  });

const RECHECK_INTERVAL_MS = 3 * 60 * 1000;

export const recheckPendingSubjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ rechecked: number }> => {
    const { data: demo, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "demo",
    });
    if (roleError || demo) return { rechecked: 0 };
    const profile = await context.supabase
      .from("profiles")
      .select("last_recheck_at")
      .eq("id", context.userId)
      .single();
    if (profile.error) return { rechecked: 0 };
    const last = profile.data.last_recheck_at
      ? new Date(profile.data.last_recheck_at).getTime()
      : 0;
    if (Date.now() - last < RECHECK_INTERVAL_MS) return { rechecked: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { readAiBlock, persistAiBlock } = await import("./ai-block.server");
    const block = await readAiBlock(supabaseAdmin);
    if (!block || block.category) return { rechecked: 0 };
    const stamped = await supabaseAdmin
      .from("profiles")
      .update({ last_recheck_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (stamped.error) return { rechecked: 0 };
    const pending = await supabaseAdmin
      .from("subjects")
      .select("id,identity_a,identity_b,jurisdictions!subjects_identity_a_fkey(name)")
      .eq("created_by", context.userId)
      .eq("status", "pending");
    const newlyPublished: string[] = [];
    const { requestPlateGuess, fillPlateGuesses } = await import("./plate-guesses.server");
    const { runAfterResponse } = await import("./after-response.server");
    let rechecked = 0;
    let halted = false;
    if (!pending.error && pending.data && pending.data.length > 0) {
      const { checkSubject } = await import("./plate-moderation.server");
      for (const subject of pending.data) {
        const joined = subject.jurisdictions as unknown as { name: string } | null;
        const result = await checkSubject(joined?.name ?? subject.identity_a, subject.identity_b);
        if (result.block) await persistAiBlock(supabaseAdmin, result.block, result.runId);
        if (result.outcome === "unavailable") {
          halted = true;
          break;
        }
        rechecked++;
        if (result.outcome === "approved") {
          const updated = await supabaseAdmin
            .from("subjects")
            .update({ status: "published", published_at: new Date().toISOString() })
            .eq("id", subject.id)
            .eq("status", "pending")
            .select("id");
          if (updated.data && updated.data.length > 0) {
            newlyPublished.push(subject.id);
            runAfterResponse(requestPlateGuess(subject.id));
            await supabaseAdmin.from("notifications").insert({
              user_id: context.userId,
              kind: "subject_published",
              subject_id: subject.id,
            });
          }
        } else {
          const updated = await supabaseAdmin
            .from("subjects")
            .update({ status: "rejected" })
            .eq("id", subject.id)
            .eq("status", "pending")
            .select("id");
          if (updated.data && updated.data.length > 0) {
            await supabaseAdmin.from("notifications").insert({
              user_id: context.userId,
              kind: "subject_rejected",
              subject_id: subject.id,
            });
          }
        }
      }
    }
    const pendingStories = halted
      ? { data: null, error: null }
      : await supabaseAdmin
          .from("stories")
          .select("id,subject_id,meaning,body,subjects!stories_subject_id_fkey(identity_b)")
          .eq("author_id", context.userId)
          .eq("status", "pending");
    if (!pendingStories.error && pendingStories.data && pendingStories.data.length > 0) {
      const { checkStory } = await import("./story-moderation.server");
      const { requestSummaryRefresh } = await import("./summary-refresh.server");
      const { runAfterResponse } = await import("./after-response.server");
      for (const story of pendingStories.data) {
        const joined = story.subjects as unknown as { identity_b: string } | null;
        const result = await checkStory(story.meaning, story.body ?? "", joined?.identity_b ?? "");
        if (result.block) await persistAiBlock(supabaseAdmin, result.block, result.runId);
        if (result.outcome === "unavailable") break;
        rechecked++;
        if (result.outcome === "approved") {
          const updated = await supabaseAdmin
            .from("stories")
            .update({ status: "published", published_at: new Date().toISOString() })
            .eq("id", story.id)
            .eq("status", "pending")
            .select("id");
          if (updated.data && updated.data.length > 0) {
            await supabaseAdmin.from("notifications").insert({
              user_id: context.userId,
              kind: "story_published",
              subject_id: story.subject_id,
              story_id: story.id,
            });
            runAfterResponse(requestSummaryRefresh(story.subject_id));
          }
        } else {
          const updated = await supabaseAdmin
            .from("stories")
            .update({ status: "rejected" })
            .eq("id", story.id)
            .eq("status", "pending")
            .select("id");
          if (updated.data && updated.data.length > 0) {
            await supabaseAdmin.from("notifications").insert({
              user_id: context.userId,
              kind: "story_rejected",
              subject_id: story.subject_id,
              story_id: story.id,
            });
          }
        }
      }
    }
    runAfterResponse(fillPlateGuesses(context.userId, newlyPublished));
    return { rechecked };
  });
