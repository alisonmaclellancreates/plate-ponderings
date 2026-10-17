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
  photo_path: string | null;
};

/**
 * "unavailable" and "blocked" mean stop: the AI could not answer, or a block was
 * persisted through the shared pause. "unchanged" means the guarded update found
 * no pending row (someone else got there first), so nothing changed.
 */
export type RecheckOutcome = "published" | "rejected" | "unchanged" | "unavailable" | "blocked";

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
  if (result.block) {
    await persistAiBlock(admin, result.block, result.runId);
    return "blocked";
  }
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
  if (!updated.data || updated.data.length === 0) return "unchanged";
  {
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
  // A story with a photo is checked with the photo, exactly as in addStory. A
  // failed download means the check cannot run: the story stays pending.
  let photoDataUrl: string | undefined;
  if (story.photo_path) {
    const { STORY_PHOTO_BUCKET } = await import("./submissions.functions");
    const downloaded = await admin.storage.from(STORY_PHOTO_BUCKET).download(story.photo_path);
    if (downloaded.error || !downloaded.data) return "unavailable";
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    photoDataUrl = `data:image/jpeg;base64,${btoa(binary)}`;
  }
  const result = await checkStory(story.meaning, story.body ?? "", story.plateText, photoDataUrl);
  if (result.block) {
    await persistAiBlock(admin, result.block, result.runId);
    return "blocked";
  }
  if (result.outcome === "unavailable") return "unavailable";
  const approved = result.outcome === "approved";
  if (!approved && story.photo_path) {
    const { STORY_PHOTO_BUCKET } = await import("./submissions.functions");
    await admin.storage.from(STORY_PHOTO_BUCKET).remove([story.photo_path]);
  }
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
  if (!updated.data || updated.data.length === 0) return "unchanged";
  {
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
