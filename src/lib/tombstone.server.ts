import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { STORY_PHOTO_BUCKET } from "./submissions.functions";

type Admin = SupabaseClient<Database>;

const TOMBSTONE = { status: "deleted", meaning: "", body: null, photo_path: null } as const;

/**
 * Tombstones the author's published or hidden stories: the conditions sit in
 * the update itself, then hearts and photos go and each subject's summary is
 * asked to refresh. Returns the affected subject ids, or null on a read error.
 */
export async function tombstoneStories(
  admin: Admin,
  target: { ids?: string[]; authorId: string },
): Promise<string[] | null> {
  let read = admin
    .from("stories")
    .select("id,subject_id,photo_path")
    .eq("author_id", target.authorId)
    .in("status", ["published", "hidden"]);
  if (target.ids) read = read.in("id", target.ids);
  const rows = await read;
  if (rows.error) return null;
  if (rows.data.length === 0) return [];
  const ids = rows.data.map((r) => r.id);
  const updated = await admin
    .from("stories")
    .update({ ...TOMBSTONE, removed_at: new Date().toISOString() })
    .in("id", ids)
    .eq("author_id", target.authorId)
    .in("status", ["published", "hidden"])
    .select("id,subject_id");
  if (updated.error) return null;
  const done = updated.data.map((r) => r.id);
  if (done.length === 0) return [];
  await admin.from("hearts").delete().in("story_id", done);
  const photos = rows.data
    .filter((r) => done.includes(r.id))
    .flatMap((r) => (r.photo_path ? [r.photo_path] : []));
  if (photos.length > 0) await admin.storage.from(STORY_PHOTO_BUCKET).remove(photos);
  const subjects = [...new Set(updated.data.map((r) => r.subject_id))];
  const { requestSummaryRefresh } = await import("./summary-refresh.server");
  const { runAfterResponse } = await import("./after-response.server");
  for (const subject of subjects) runAfterResponse(requestSummaryRefresh(subject));
  return subjects;
}
