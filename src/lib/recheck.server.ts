import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Admin = SupabaseClient<Database>;

export type PendingSubject = { id: string; identity_a: string; identity_b: string; name: string };
export type PendingStory = {
  id: string;
  subject_id: string;
  meaning: string;
  body: string | null;
  plateText: string;
};

/** "unavailable" means stop: the AI could not answer or a block was persisted. */
export type RecheckOutcome = "published" | "rejected" | "unavailable";

/**
 * Checks one pending plate and applies the result for its owner. Shared by the
 * owner's own recheck and the admin sweep so both publish and notify the same way.
 */
export async function recheckSubject(
  admin: Admin,
  subject: PendingSubject,
  ownerId: string | null,
): Promise<RecheckOutcome> {
  const { checkSubject } = await import("./plate-moderation.server");
  const { persistAiBlock } = await import("./ai-block.server");
  const result = await checkSubject(subject.name, subject.identity_b);
  if (result.block) await persistAiBlock(admin, result.block, result.runId);
  if (result.outcome === "unavailable") return "unavailable";
  const approved = result.outcome === "approved";
  const updated = await admin
    .from("subjects")
    .update(
      approved
        ? { status: "published", published_at: new Date().toISOString() }
        : { status: "rejected" },
    )
    .eq("id", subject.id)
    .eq("status", "pending")
    .select("id");
  if (updated.data && updated.data.length > 0) {
    if (approved) {
      const { requestPlateGuess } = await import("./plate-guesses.server");
      const { runAfterResponse } = await import("./after-response.server");
      runAfterResponse(requestPlateGuess(subject.id));
    }
    if (ownerId)
      await admin.from("notifications").insert({
        user_id: ownerId,
        kind: approved ? "subject_published" : "subject_rejected",
        subject_id: subject.id,
      });
  }
  return approved ? "published" : "rejected";
}

/** Checks one pending story and applies the result for its author. */
export async function recheckStory(
  admin: Admin,
  story: PendingStory,
  ownerId: string | null,
): Promise<RecheckOutcome> {
  const { checkStory } = await import("./story-moderation.server");
  const { persistAiBlock } = await import("./ai-block.server");
  const result = await checkStory(story.meaning, story.body ?? "", story.plateText);
  if (result.block) await persistAiBlock(admin, result.block, result.runId);
  if (result.outcome === "unavailable") return "unavailable";
  const approved = result.outcome === "approved";
  const updated = await admin
    .from("stories")
    .update(
      approved
        ? { status: "published", published_at: new Date().toISOString() }
        : { status: "rejected" },
    )
    .eq("id", story.id)
    .eq("status", "pending")
    .select("id");
  if (updated.data && updated.data.length > 0) {
    if (ownerId)
      await admin.from("notifications").insert({
        user_id: ownerId,
        kind: approved ? "story_published" : "story_rejected",
        subject_id: story.subject_id,
        story_id: story.id,
      });
    if (approved) {
      const { requestSummaryRefresh } = await import("./summary-refresh.server");
      const { runAfterResponse } = await import("./after-response.server");
      runAfterResponse(requestSummaryRefresh(story.subject_id));
    }
  }
  return approved ? "published" : "rejected";
}
