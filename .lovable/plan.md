# Step 49: story photos with browser-side blur

Add the optional photo to the story flow: choose, AI box detection, adjust, canvas blur, JPEG export, private upload. The original is never stored, logged, or uploaded.

## Database (needs approval)

1. **Bucket `story-photos`** (private, via the storage tool, not SQL). Migration adds RLS on `storage.objects`: authenticated users may INSERT only into their own folder (`(storage.foldername(name))[1] = auth.uid()::text`), nothing else. Reads go through short-lived signed URLs made server-side; deletes (rejected story, account deletion) use the admin client server-side. No anon access.
2. **Rate limit for detection**: new service-only table `photo_detect_attempts` (id, user_id, attempted_at) plus `consume_photo_detect_attempt(_user_id)` security-definer function, mirroring `story_save_attempts`. No browser grants or policies. Step 41 database tests get a matching `tests/db/photo-attempts.sql` (begin/rollback, set local role).

No change to `stories`: `photo_path` already exists.

## Server

- `src/lib/photo-detect.server.ts`: sends the image to the Lovable AI gateway (vision-capable model) asking only for the plate box as fractions of width/height, or "none". Same gateway/block handling as `checkStory`; the shared AI pause applies. The image bytes live only in the request body; nothing is written to storage or logs.
- `detectPlateBox` server function: `requireSupabaseAuth`, refuses demo, validates input (data URL, JPEG/PNG/WebP only, size cap), consumes a detect attempt (rate limit copy as the other limits), checks the shared AI pause first, returns `{ box: {x,y,w,h} | null }` or `unavailable`.
- `addStory` accepts optional `photoPath`. Server validates the path is inside the caller's own folder before storing it on the story. A rejected story deletes the uploaded photo (admin client). Pending/published keep it.
- `getPlateStories` returns a short-lived signed URL per published `photo_path` (generated server-side, ~15 min expiry). Block-filtering rules from step 48 unchanged.

## Client

- `src/lib/photo-blur.ts` (pure, unit-tested): box fraction maths (clamp, min size, draw-from-drag), and `renderBlurredPhoto(image, box)` drawing to canvas: heavy blur outside the box (stacked downscale draw, no CSS overlay), sharp box, export as JPEG with longest side <= 1600 px.
- `src/components/site/PhotoEditor.tsx`: the existing editor shell (dialog on desktop, full-screen on mobile) made real. Pointer-based drag to move, corner handles to resize, drag-on-empty to draw when no box was found. Reset restores the AI suggestion; Try again re-runs detection. Review shows the actual processed canvas image with the brief's review sentence (no ticks). Any box change after review rebuilds the preview and requires confirming again.
- `AddStoryFlow` step 2 becomes the real photo step: file input (JPEG/PNG/WebP), unreadable file shows the brief's message with a continue-without path, "Continue without a photo" stays. On "Use This Photo": export the canvas, upload the JPEG to `story-photos/{userId}/{uuid}.jpg` via the browser client (own-folder INSERT policy), then submit with `photoPath`. Step 3 shows the processed image.
- Stop rule honored: if the adjustable box or canvas blur proves unreliable, I stop and report rather than fall back to storing the original or a CSS-only blur.

## Analytics

`photo_added` (properties: `box_found`, `box_adjusted`) on confirmed use; `photo_skipped` on continue-without and remove. Registered in the event registry; nothing on the never-send list (no image data, no coordinates).

## Previews

`/previews/story-photo` (unnested `previews_.story-photo.tsx` pattern): the real editor with a sample image covering choose, adjust-with-box, adjust-no-box, and review states; inert actions, no database. `/previews` list updated (story flow marked live where applicable, sample page listed). Step 51 deletes these.

## Tests

- `photo-blur.ts`: box maths (clamp, min size, drag-draw), export size cap (mock canvas).
- `detectPlateBox`: input validation, demo refusal, rate limit, AI pause, box-or-none mapping (AI mocked).
- `addStory`: photoPath ownership check, rejected story deletes the photo.
- `getPlateStories`: signed URL present only for published stories with photos.
- Flow/editor component tests: unreadable file path, no-box draw path, review re-confirm after box change, analytics events.
- `tests/db/photo-attempts.sql` plus rerun of all `tests/db` files.

Run: `bunx vitest related` on changed files, lint, prettier. CI stays authoritative.

## Assumptions

- Bucket name `story-photos` (step 48's account deletion already assumes it).
- Detection uses the same gateway with a vision-capable model; exact model chosen at build time.
- One photo per story, replaced only by resubmission (no edit flow in this step).
