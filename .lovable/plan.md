# Step 49: story photos with browser-side blur

Add the optional photo to the story flow: choose, AI box detection, adjust, canvas blur, JPEG export, server-side upload. The original is never stored, logged, or uploaded.

## Database (needs approval)

The `story-photos` bucket and its owner-folder policies already exist (step 41, migration 0001); the bucket is confirmed present, so nothing is created or duplicated.

One migration:

1. **Drop the browser upload rule** `story-photos: author uploads own folder` on `storage.objects`. Uploads move to a server function using the admin client, so the browser no longer needs INSERT. The existing SELECT (own folder) and DELETE (own folder) policies stay.
2. **Rate limit for detection**: new service-only table `photo_detect_attempts` (id, user_id, attempted_at) plus `consume_photo_detect_attempt(_user_id)` security-definer function, mirroring `consume_story_save_attempt` (advisory lock, 5 per 15 minutes, demo refused). No browser grants or policies. Matching `tests/db/photo-attempts.sql` (begin/rollback, set local role).

No change to `stories`: `photo_path` already exists.

## Server

- `src/lib/photo-detect.server.ts`: sends a downscaled copy (longest side about 1024 px, EXIF rotation applied, produced in the browser from the same decoded image the canvas uses) to the Lovable AI gateway with a vision-capable model, asking only for the plate box as fractions of width/height, or "none". Same gateway/block handling as `checkStory`; the shared AI pause applies. Image bytes live only in the request body; nothing is written to storage or logs.
- `detectPlateBox` server function: `requireSupabaseAuth`, refuses demo, validates input (data URL, JPEG/PNG/WebP, size cap), checks the shared AI pause, consumes a detect attempt (shared rate-limit copy), returns `{ box: {x,y,w,h} | null }` or `unavailable`.
- **Detection is a shortcut, never a gate.** When `detectPlateBox` returns `unavailable`, is rate-limited, or the shared AI pause is on, the editor goes straight to the draw-a-box path with the brief's "no box found" message ("We couldn't find the plate in this photo. Draw a box around it to keep it clear."), exactly as when the AI returns "none". The photo flow never blocks on detection.
- **Safe before the migration lands.** If `consume_photo_detect_attempt` errors for any reason, including the function not existing yet on a database without this migration, `detectPlateBox` returns `unavailable` and the editor takes the same draw-a-box path. No hard failure. Tested.
- `uploadStoryPhoto` server function: `requireSupabaseAuth`, refuses demo. Receives the processed JPEG, verifies it is a JPEG, under a size cap, and at most 1600 px on its longest side (decoded and measured server-side), then stores it in the caller's own folder (`{userId}/{uuid}.jpg`) with the admin client. Returns the stored path.
- `addStory` accepts optional `photoPath`, checks the path is in the caller's own folder, and **deletes the uploaded photo for every outcome that saves no story**: rejected, rate-limited, validation, error, demo. Pending and published keep it.
- `getPlateStories` returns a short-lived signed URL per published `photo_path` (server-side, ~15 min expiry). Step 48 block-filtering unchanged.

## Client

- `src/lib/photo-blur.ts` (pure, unit-tested): decode with EXIF rotation applied (`createImageBitmap` with `imageOrientation: "from-image"`), box fraction maths (clamp, min size, draw-from-drag), downscale-to-1024 copy for detection, and `renderBlurredPhoto(image, box)`: heavy blur outside the box (stacked downscale draws on canvas, never a CSS overlay), sharp box, export as JPEG with longest side <= 1600 px.
- `src/components/site/PhotoEditor.tsx`: the existing editor shell (dialog on desktop, full-screen on mobile) made real. Pointer drag to move, corner handles to resize, drag-on-empty to draw when no box was found. Reset restores the AI suggestion; Try again re-runs detection. Review shows the actual processed canvas image with the brief's review sentence (no ticks). Any box change after review rebuilds the preview and requires confirming again.
- `AddStoryFlow` step 2 becomes the real photo step: file input (JPEG/PNG/WebP), unreadable file shows the brief's message with a continue-without path, "Continue without a photo" stays. On "Use This Photo": export the canvas, call `uploadStoryPhoto`, then submit with the returned `photoPath`. Step 3 shows the processed image.
- Stop rule honored: if the adjustable box or canvas blur proves unreliable, I stop and report rather than fall back to storing the original or a CSS-only blur.

## Story check with photo

I will report whether adding the processed photo to the existing story check is simple (same call, image added as a vision input). If it is not simple, it stays out of this step.

## Analytics

`photo_added` (properties: `box_found`, `box_adjusted`) on confirmed use; `photo_skipped` on continue-without and remove. Registered in the event registry; nothing on the never-send list (no image data, no coordinates).

## Previews

`/previews/story-photo` (unnested `previews_.story-photo.tsx` pattern): the real editor with a sample image covering choose, adjust-with-box, adjust-no-box, and review states; inert actions, no database. `/previews` list updated. Step 51 deletes these.

## Tests

- `photo-blur.ts`: box maths including a rotated (EXIF) image, clamp, min size, drag-draw, export size cap (mock canvas).
- `detectPlateBox`: input validation, demo refusal, rate limit, AI pause, box-or-none mapping (AI mocked), and `consume_photo_detect_attempt` erroring (including not existing) returning `unavailable`.
- `uploadStoryPhoto`: JPEG/type/size/dimension checks, own-folder path, demo refusal.
- `addStory`: photoPath ownership check; photo deleted on rejected, rate-limited, validation, error and demo outcomes.
- `getPlateStories`: signed URL only for published stories with photos.
- Flow/editor components: unreadable file path, no-box draw path, detection unavailable/rate-limited/paused each landing on the draw-a-box path with the brief's message, review re-confirm after box change, analytics events.
- `tests/db/photo-attempts.sql` plus rerun of all `tests/db` files.

Run: `bunx vitest related` on changed files, lint, prettier. CI stays authoritative.

## Assumptions

- Detection uses the same gateway with a vision-capable model; exact model chosen at build time.
- One photo per story, replaced only by resubmission (no edit flow in this step).
