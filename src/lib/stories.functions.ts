import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEMO_MESSAGE, RATE_LIMIT_MESSAGE } from "./account-rules";
import { MEANING_MAX, MORE_MAX } from "./story-form";
import { boxFromColumn, normalizeSubmittedBox, type Box } from "./photo-blur";

export const HOW_KEYS = ["owner", "knows_owner", "secondhand", "guess"] as const;
export type HowKey = (typeof HOW_KEYS)[number];

type StoryInput = {
  plateId: string;
  meaning: string;
  source: string;
  more: string;
  photoPath: string;
  /** Confirmed plate box, as fractions of the processed photo. */
  photoBox?: unknown;
};

const storyInput = (data: StoryInput): StoryInput => ({
  plateId: typeof data.plateId === "string" ? data.plateId : "",
  meaning: typeof data.meaning === "string" ? data.meaning : "",
  source: typeof data.source === "string" ? data.source : "",
  more: typeof data.more === "string" ? data.more : "",
  photoPath: typeof data.photoPath === "string" ? data.photoPath : "",
  photoBox: data.photoBox ?? null,
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
    // Every no-save outcome logs one stage tag (never story text or photo) so
    // failed submissions can be traced in server logs.
    const trace = (stage: string, error?: { message?: string } | null): void => {
      console.warn(JSON.stringify({ event: "add_story", stage, error: error?.message ?? null }));
    };
    if (roleError) {
      trace("role", roleError);
      return { outcome: "error" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // A photo path is exactly the caller's folder plus one uuid.jpg; anything
    // else (dot segments, other folders, other names) is refused.
    const photoPathPattern = new RegExp(
      `^${context.userId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.jpg$`,
    );
    if (data.photoPath && !photoPathPattern.test(data.photoPath)) {
      trace("photo-path");
      return { outcome: "error" };
    }
    // A photo needs a valid box; a box without a photo is refused.
    if (!data.photoPath && data.photoBox !== null) {
      trace("photo-box");
      return { outcome: "validation" };
    }
    const box = data.photoPath ? normalizeSubmittedBox(data.photoBox) : null;
    const photoBox = box ? [box.x, box.y, box.w, box.h] : null;
    // Every outcome that saves no story removes the uploaded photo.
    const deletePhoto = async (): Promise<void> => {
      if (!data.photoPath) return;
      const { STORY_PHOTO_BUCKET } = await import("./submissions.functions");
      await supabaseAdmin.storage.from(STORY_PHOTO_BUCKET).remove([data.photoPath]);
    };
    if (demo) {
      trace("demo");
      await deletePhoto();
      return { outcome: "demo", message: DEMO_MESSAGE };
    }
    if (!validateStory(data) || (data.photoPath && !box)) {
      trace("validation");
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
      trace("plate", plateError);
      await deletePhoto();
      return { outcome: "error" };
    }
    const attempt = await supabaseAdmin.rpc("consume_story_save_attempt", {
      _user_id: context.userId,
    });
    if (attempt.error) {
      trace("attempt", attempt.error);
      await deletePhoto();
      return { outcome: "error" };
    }
    if (!attempt.data) {
      trace("rate-limited");
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
        photo_box: photoBox,
        status: "pending",
      });
      if (inserted.error) {
        trace("insert-pending", inserted.error);
        await deletePhoto();
        return { outcome: "error" };
      }
      trace("pending");
      return { outcome: "pending" };
    };
    const { readAiBlock, persistAiBlock } = await import("./ai-block.server");
    const block = await readAiBlock(supabaseAdmin);
    if (!block) {
      trace("ai-block-read");
      await deletePhoto();
      return { outcome: "error" };
    }
    if (block.category) return insertPending();
    // A photo joins the same single check: download the processed JPEG and
    // pass it alongside the text. A failed download saves no story.
    let photoDataUrl: string | undefined;
    if (data.photoPath) {
      const { STORY_PHOTO_BUCKET } = await import("./submissions.functions");
      const downloaded = await supabaseAdmin.storage
        .from(STORY_PHOTO_BUCKET)
        .download(data.photoPath);
      if (downloaded.error || !downloaded.data) {
        trace("photo-download", downloaded.error);
        await deletePhoto();
        return { outcome: "error" };
      }
      const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      photoDataUrl = `data:image/jpeg;base64,${btoa(binary)}`;
    }
    const { checkStory } = await import("./story-moderation.server");
    const result = await checkStory(
      data.meaning.trim(),
      data.more.trim(),
      plate.identity_b,
      photoDataUrl,
    );
    if (result.block) await persistAiBlock(supabaseAdmin, result.block, result.runId);
    if (result.outcome === "unavailable") return insertPending();
    if (result.outcome === "rejected") {
      trace(photoDataUrl ? "rejected-with-photo" : "rejected");
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
      photo_box: photoBox,
      status: "published",
      published_at: new Date().toISOString(),
    });
    if (inserted.error) {
      trace("insert-published", inserted.error);
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
  /** Plate box within the photo, when the story was saved with one. */
  photoBox: Box | null;
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
  photo_box?: number[] | null;
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
      .select("id,meaning,source,body,author_id,published_at,photo_path,photo_box")
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
      photoBox: (r.photo_path && photos.has(r.photo_path) && boxFromColumn(r.photo_box)) || null,
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
