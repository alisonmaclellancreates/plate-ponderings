import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RATE_LIMIT_MESSAGE } from "./account-rules";
import {
  dataUrlToBytes,
  isJpeg,
  jpegDimensions,
  EXPORT_MAX_SIDE,
  PHOTO_MAX_BYTES,
  type Box,
} from "./photo-blur";
import { STORY_PHOTO_BUCKET } from "./submissions.functions";

const DETECT_INPUT_MAX_CHARS = 3_000_000;
const DETECT_MIMES = ["image/jpeg", "image/png", "image/webp"];

export type DetectPlateBoxResult =
  | { outcome: "ok"; box: Box | null }
  | { outcome: "unavailable" }
  | { outcome: "rate-limited"; message: string }
  | { outcome: "demo" };

/**
 * Find the plate box in a downscaled copy of the photo. Detection is a
 * shortcut, never a gate: every failure, including a missing rate-limit
 * function on a database without the migration, returns "unavailable" and the
 * editor falls back to drawing the box by hand.
 */
export const detectPlateBox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { image: string }) => ({
    image: typeof data.image === "string" ? data.image : "",
  }))
  .handler(async ({ data, context }): Promise<DetectPlateBoxResult> => {
    const { data: demo, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "demo",
    });
    if (roleError) return { outcome: "unavailable" };
    if (demo) return { outcome: "demo" };
    const parsed = dataUrlToBytes(data.image);
    if (
      !parsed ||
      !DETECT_MIMES.includes(parsed.mime) ||
      data.image.length > DETECT_INPUT_MAX_CHARS
    )
      return { outcome: "unavailable" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { readAiBlock, persistAiBlock } = await import("./ai-block.server");
    const block = await readAiBlock(supabaseAdmin);
    if (!block || block.category) return { outcome: "unavailable" };
    const attempt = await supabaseAdmin.rpc("consume_photo_detect_attempt", {
      _user_id: context.userId,
    });
    if (attempt.error) return { outcome: "unavailable" };
    if (!attempt.data) return { outcome: "rate-limited", message: RATE_LIMIT_MESSAGE };
    const { detectPlateBoxInImage } = await import("./photo-detect.server");
    const result = await detectPlateBoxInImage(data.image);
    if (result.outcome === "unavailable") {
      if (result.block) await persistAiBlock(supabaseAdmin, result.block, result.runId);
      return { outcome: "unavailable" };
    }
    return { outcome: "ok", box: result.box };
  });

export type UploadStoryPhotoResult =
  | { outcome: "ok"; path: string }
  | { outcome: "invalid" }
  | { outcome: "demo" }
  | { outcome: "error" };

/**
 * Store the processed photo. Only the blurred, re-encoded JPEG is accepted:
 * the bytes must be a JPEG, under the size cap, and at most EXPORT_MAX_SIDE
 * on the longest side. It lands in the caller's own folder.
 */
export const uploadStoryPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { jpeg: string }) => ({
    jpeg: typeof data.jpeg === "string" ? data.jpeg : "",
  }))
  .handler(async ({ data, context }): Promise<UploadStoryPhotoResult> => {
    const { data: demo, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "demo",
    });
    if (roleError) return { outcome: "error" };
    if (demo) return { outcome: "demo" };
    const parsed = dataUrlToBytes(data.jpeg);
    if (!parsed || parsed.mime !== "image/jpeg") return { outcome: "invalid" };
    if (parsed.bytes.length > PHOTO_MAX_BYTES) return { outcome: "invalid" };
    if (!isJpeg(parsed.bytes)) return { outcome: "invalid" };
    const dims = jpegDimensions(parsed.bytes);
    if (!dims || Math.max(dims.width, dims.height) > EXPORT_MAX_SIDE) return { outcome: "invalid" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${context.userId}/${crypto.randomUUID()}.jpg`;
    const uploaded = await supabaseAdmin.storage
      .from(STORY_PHOTO_BUCKET)
      .upload(path, parsed.bytes, { contentType: "image/jpeg" });
    if (uploaded.error) return { outcome: "error" };
    return { outcome: "ok", path };
  });
