import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEMO_MESSAGE, RATE_LIMIT_MESSAGE } from "./account-rules";
import { MEANING_MAX, MORE_MAX } from "./story-form";

export const HOW_KEYS = ["owner", "knows_owner", "secondhand", "guess"] as const;
export type HowKey = (typeof HOW_KEYS)[number];

type StoryInput = {
  plateId: string;
  meaning: string;
  source: string;
  more: string;
  photoPath: string;
};

const storyInput = (data: StoryInput): StoryInput => ({
  plateId: typeof data.plateId === "string" ? data.plateId : "",
  meaning: typeof data.meaning === "string" ? data.meaning : "",
  source: typeof data.source === "string" ? data.source : "",
  more: typeof data.more === "string" ? data.more : "",
  photoPath: typeof data.photoPath === "string" ? data.photoPath : "",
});

/** Brief limits: meaning 3–80, source one of the four keys, more ≤ 500. */
export function validateStory(data: StoryInput): boolean {
  const meaning = data.meaning.trim();
  return (
    meaning.length >= 3 &&
    meaning.length <= MEANING_MAX &&
    (HOW_KEYS as readonly string[]).includes(data.source) &&
    data.more.length <= MORE_MAX
  );
}

export type AddStoryResult =
  | { outcome: "published" }
  | { outcome: "pending" }
  | { outcome: "rejected" }
  | { outcome: "rate-limited"; message: string }
  | { outcome: "demo"; message: string }
  | { outcome: "validation" }
  | { outcome: "error" };

export const addStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(storyInput)
  .handler(async ({ data, context }): Promise<AddStoryResult> => {
    const { data: demo, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "demo",
    });
    if (roleError) return { outcome: "error" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // A photo path is exactly the caller's folder plus one uuid.jpg; anything
    // else (dot segments, other folders, other names) is refused.
    const photoPathPattern = new RegExp(
      `^${context.userId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.jpg$`,
    );
    if (data.photoPath && !photoPathPattern.test(data.photoPath)) return { outcome: "error" };
    // Every outcome that saves no story removes the uploaded photo.
    const deletePhoto = async (): Promise<void> => {
      if (!data.photoPath) return;
      const { STORY_PHOTO_BUCKET } = await import("./submissions.functions");
      await supabaseAdmin.storage.from(STORY_PHOTO_BUCKET).remove([data.photoPath]);
    };
    if (demo) {
      await deletePhoto();
      return { outcome: "demo", message: DEMO_MESSAGE };
    }
    if (!validateStory(data)) {
      await deletePhoto();
      return { outcome: "validation" };
    }
    const { data: plate, error: plateError } = await supabaseAdmin
      .from("subjects")
      .select("id,identity_b")
      .eq("id", data.plateId)
      .eq("status", "published")
      .maybeSingle();
    if (plateError || !plate) {
      await deletePhoto();
      return { outcome: "error" };
    }
    const attempt = await supabaseAdmin.rpc("consume_story_save_attempt", {
      _user_id: context.userId,
    });
    if (attempt.error) {
      await deletePhoto();
      return { outcome: "error" };
    }
    if (!attempt.data) {
      await deletePhoto();
      return { outcome: "rate-limited", message: RATE_LIMIT_MESSAGE };
    }
    const insertPending = async (): Promise<AddStoryResult> => {
      const inserted = await supabaseAdmin.from("stories").insert({
        subject_id: plate.id,
        author_id: context.userId,
        meaning: data.meaning.trim(),
        source: data.source,
        body: data.more.trim() || null,
        photo_path: data.photoPath || null,
        status: "pending",
      });
      if (inserted.error) {
        await deletePhoto();
        return { outcome: "error" };
      }
      return { outcome: "pending" };
    };
    const { readAiBlock, persistAiBlock } = await import("./ai-block.server");
    const block = await readAiBlock(supabaseAdmin);
    if (!block) {
      await deletePhoto();
      return { outcome: "error" };
    }
    if (block.category) return insertPending();
    const { checkStory } = await import("./story-moderation.server");
    const result = await checkStory(data.meaning.trim(), data.more.trim(), plate.identity_b);
    if (result.block) await persistAiBlock(supabaseAdmin, result.block, result.runId);
    if (result.outcome === "unavailable") return insertPending();
    if (result.outcome === "rejected") {
      await deletePhoto();
      return { outcome: "rejected" };
    }
    const inserted = await supabaseAdmin.from("stories").insert({
      subject_id: plate.id,
      author_id: context.userId,
      meaning: data.meaning.trim(),
      source: data.source,
      body: data.more.trim() || null,
      photo_path: data.photoPath || null,
      status: "published",
      published_at: new Date().toISOString(),
    });
    if (inserted.error) {
      await deletePhoto();
      return { outcome: "error" };
    }
    const { requestSummaryRefresh } = await import("./summary-refresh.server");
    const { runAfterResponse } = await import("./after-response.server");
    runAfterResponse(requestSummaryRefresh(plate.id));
    return { outcome: "published" };
  });

export type PlateStory = {
  id: string;
  meaning: string;
  source: HowKey;
  body: string | null;
  handle: string;
  hearts: number;
  publishedAt: string;
  /** Short-lived signed link to the blurred photo, when the story has one. */
  photo: string | null;
  /** The verified viewer wrote this story. */
  isOwn: boolean;
  /** The verified viewer has hearted this story. */
  hearted: boolean;
};

export type PlateStoriesResult = {
  stories: PlateStory[];
  total: number;
  pending: PlateStory[];
  storyCount: number;
  ownerHandle: string | null;
  hasOwnerStory: boolean;
};

export const STORY_PAGE_SIZE = 5;

type StoryRow = {
  id: string;
  meaning: string;
  source: string;
  body: string | null;
  author_id: string | null;
  published_at: string | null;
  photo_path: string | null;
};

/**
 * Published stories for a published plate. The visitor's identity comes only
 * from their verified session on the server, never from a parameter: signed
 * out gets published stories only; signed in also gets their own pending
 * stories and their block list applied.
 */
export const getPlateStories = createServerFn({ method: "POST" })
  .inputValidator((data: { plateId: string }) => ({
    plateId: typeof data.plateId === "string" ? data.plateId : "",
  }))
  .handler(async ({ data }): Promise<PlateStoriesResult | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plate, error: plateError } = await supabaseAdmin
      .from("subjects")
      .select("id")
      .eq("id", data.plateId)
      .eq("status", "published")
      .maybeSingle();
    if (plateError || !plate) return null;

    // Verified session only: the bearer token is validated server-side.
    let viewerId: string | null = null;
    const authHeader = getRequest()?.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      if (token.split(".").length === 3) {
        const { data: user, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && user.user) viewerId = user.user.id;
      }
    }

    let blockedIds: string[] = [];
    if (viewerId) {
      const { data: blocks } = await supabaseAdmin
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", viewerId);
      blockedIds = (blocks ?? []).map((b) => b.blocked_id);
    }

    const { data: rows, error } = await supabaseAdmin
      .from("stories")
      .select("id,meaning,source,body,author_id,published_at,photo_path")
      .eq("subject_id", plate.id)
      .eq("status", "published")
      .order("published_at", { ascending: true });
    if (error) return null;

    // Public facts are independent of the viewer's personal block list.
    const published = (rows ?? []) as StoryRow[];
    const publicOwnerStories = published.filter((r) => r.source === "owner");
    const visible = published.filter(
      (r) => r.author_id === null || !blockedIds.includes(r.author_id),
    );

    let pendingRows: StoryRow[] = [];
    if (viewerId) {
      const { data: ownPending } = await supabaseAdmin
        .from("stories")
        .select("id,meaning,source,body,author_id,published_at")
        .eq("subject_id", plate.id)
        .eq("status", "pending")
        .eq("author_id", viewerId)
        .order("created_at", { ascending: true });
      pendingRows = (ownPending ?? []) as StoryRow[];
    }

    // Handles come from profiles in a separate lookup; stories has no FK to it.
    const authorIds = [
      ...new Set(
        [...visible, ...publicOwnerStories, ...pendingRows]
          .map((r) => r.author_id)
          .filter((id): id is string => id !== null),
      ),
    ];
    const handles = new Map<string, string>();
    if (authorIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id,handle")
        .in("id", authorIds);
      for (const p of profiles ?? []) handles.set(p.id, p.handle);
    }

    const { data: heartRows } = await supabaseAdmin.rpc("story_heart_counts", {
      _subject_id: plate.id,
    });
    const hearts = new Map((heartRows ?? []).map((h) => [h.story_id, Number(h.hearts)]));
    let mine = new Set<string>();
    if (viewerId && visible.length > 0) {
      const { data: given } = await supabaseAdmin
        .from("hearts")
        .select("story_id")
        .eq("user_id", viewerId)
        .in(
          "story_id",
          visible.map((r) => r.id),
        );
      mine = new Set((given ?? []).map((h) => h.story_id));
    }

    // Photos are private: published photos reach the page only through
    // short-lived signed links made here, never through a public URL.
    const photoPaths = [
      ...new Set(published.map((r) => r.photo_path).filter((p): p is string => Boolean(p))),
    ];
    const photos = new Map<string, string>();
    if (photoPaths.length > 0) {
      const { STORY_PHOTO_BUCKET } = await import("./submissions.functions");
      const { data: signed } = await supabaseAdmin.storage
        .from(STORY_PHOTO_BUCKET)
        .createSignedUrls(photoPaths, 900);
      for (let i = 0; i < photoPaths.length; i++) {
        const url = signed?.[i]?.signedUrl;
        if (url) photos.set(photoPaths[i]!, url);
      }
    }

    const toStory = (r: StoryRow): PlateStory => ({
      id: r.id,
      meaning: r.meaning,
      source: r.source as HowKey,
      body: r.body,
      handle: (r.author_id && handles.get(r.author_id)) || "Traveler",
      hearts: hearts.get(r.id) ?? 0,
      publishedAt: r.published_at ?? "",
      photo: (r.photo_path && photos.get(r.photo_path)) || null,
      isOwn: viewerId !== null && r.author_id === viewerId,
      hearted: mine.has(r.id),
    });

    const ownerStories = visible.filter((r) => r.source === "owner");
    const rest = visible.filter((r) => r.source !== "owner");
    const ordered = [...ownerStories, ...rest].map(toStory);

    return {
      stories: ordered,
      total: ordered.length,
      pending: pendingRows.map(toStory),
      storyCount: published.length,
      ownerHandle:
        publicOwnerStories.length > 0
          ? (publicOwnerStories[0]?.author_id && handles.get(publicOwnerStories[0].author_id)) ||
            "Traveler"
          : null,
      hasOwnerStory: publicOwnerStories.length > 0,
    };
  });
