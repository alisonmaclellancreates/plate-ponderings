import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { STORY_PHOTO_BUCKET } from "./submissions.functions";

type Admin = SupabaseClient<Database>;

/**
 * Removes an account in the brief's order. Published and hidden stories become
 * tombstones; never-published rows go outright; published plates stay, unowned.
 * Throws on the first failed step so the caller reports an error and nothing
 * claims success.
 */
export async function deleteAccountData(admin: Admin, userId: string): Promise<void> {
  const { tombstoneStories } = await import("./tombstone.server");
  const check = (step: string, result: { error: unknown }) => {
    if (result.error) throw new Error(`Account deletion failed at ${step}`);
  };
  if ((await tombstoneStories(admin, { authorId: userId })) === null)
    throw new Error("Account deletion failed at tombstones");
  check(
    "unpublished stories",
    await admin
      .from("stories")
      .delete()
      .eq("author_id", userId)
      .in("status", ["pending", "rejected"]),
  );
  check(
    "unpublished plates",
    await admin
      .from("subjects")
      .delete()
      .eq("created_by", userId)
      .in("status", ["pending", "rejected"]),
  );
  const photos = await admin.storage.from(STORY_PHOTO_BUCKET).list(userId, { limit: 1000 });
  check("photo list", photos);
  const paths = (photos.data ?? []).map((f) => `${userId}/${f.name}`);
  if (paths.length > 0) check("photos", await admin.storage.from(STORY_PHOTO_BUCKET).remove(paths));
  check("hearts", await admin.from("hearts").delete().eq("user_id", userId));
  check(
    "published plates",
    await admin.from("subjects").update({ created_by: null }).eq("created_by", userId),
  );
  check(
    "reports",
    await admin.from("reports").update({ reporter_id: null }).eq("reporter_id", userId),
  );
  check("notifications", await admin.from("notifications").delete().eq("user_id", userId));
  check(
    "blocks",
    await admin.from("blocks").delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
  );
  check("profile", await admin.from("profiles").delete().eq("id", userId));
  check("auth user", await admin.auth.admin.deleteUser(userId));
}

/** Deletes the person's PostHog data; failures are logged and never block account deletion. */
export async function deletePosthogPerson(distinctId: string): Promise<void> {
  const key = process.env["POSTHOG_PERSONAL_API_KEY"];
  const project = process.env["POSTHOG_PROJECT_ID"];
  if (!key || !project) {
    console.error("PostHog person deletion skipped: not configured");
    return;
  }
  const host =
    process.env["POSTHOG_REGION"] === "us" ? "https://us.posthog.com" : "https://eu.posthog.com";
  const headers = { Authorization: `Bearer ${key}` };
  try {
    const found = await fetch(
      `${host}/api/projects/${project}/persons/?distinct_id=${encodeURIComponent(distinctId)}`,
      { headers },
    );
    if (!found.ok) throw new Error(`lookup ${found.status}`);
    const body = (await found.json()) as { results?: { id: string }[] };
    for (const person of body.results ?? []) {
      const removed = await fetch(
        `${host}/api/projects/${project}/persons/${person.id}/?delete_events=true`,
        { method: "DELETE", headers },
      );
      if (!removed.ok) throw new Error(`delete ${removed.status}`);
    }
  } catch (error) {
    console.error("PostHog person deletion failed", error);
  }
}
