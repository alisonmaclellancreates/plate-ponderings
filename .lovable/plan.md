# Step 49c: make story photos easy to see

## The database change (awaiting approval, not applied)

Migration 0018, staged unchanged in `docs/proposed-migrations/0018_step49c_story_photo_box.sql`:

- New nullable column `stories.photo_box real[]`: `{x, y, width, height}` as fractions.
- `stories_photo_box_valid`: one dimension, exactly 4 non-null values, x,y >= 0, width,height > 0, x+width <= 1, y+height <= 1.
- `stories_photo_box_needs_photo`: a box requires `photo_path`.
- Additive; existing rows stay null and pass. Grants and RLS unchanged (server-only writes).
- `tests/db/story-photo-box.sql` (rollback-wrapped): out-of-range, wrong length, null element, overflow, zero size and box-without-photo refused; a valid box accepted.

## Data flow

```text
PhotoEditor confirmed box --> AddStoryFlow photoReady.box --> submitStory({photoPath, photoBox})
  server: photo => valid box required; box without photo => refused
  insert published/pending rows with photo_box
getPlateStories --> { photo: signedUrl, photoBox: Box | null }
```

Every path that nulls `photo_path` also nulls `photo_box`: tombstone (delete, admin removal, account deletion), submissions dismiss/reset, rejection and recheck rejection (photo_path cleared alongside the storage removal). Box never sent to analytics.

## UI

- Shared `StoryPhoto` component used by both `RealStoryCard` and sample `StoryCard`.
  - With box: 2:1 frame, rounded, 200x100 at 360px under text/badge above hearts, 160x80 on the right at sm+ clear of the menu. Pure-CSS crop of the same `<img>` (box + margin, expanded to 2:1 around centre, shifted inward, fit when too small; never stretched or clipped). Expand icon lower-right on cream backing, aria-hidden. Whole frame is one button, navy focus ring, name "View full photo shared by {handle}". Keeps lazy loading, size attributes, alt text.
  - Without box (older stories): current thumbnail, unchanged, no button.
- Open view: existing shadcn Dialog. Heading = meaning, "Photo shared by {handle}", Close button "Close photo" visible above the image on mobile; image `object-contain`, max its stored size. Esc, outside tap and Close all close; Radix traps focus and returns it to the trigger. Image `onError` shows a short reload message instead of a broken image.
- Crop maths in a pure helper (`src/lib/photo-crop.ts`) with unit tests.
- `/previews/story-photo`: zoomed card, story without a box, and open view, sample data only.

## Checks

Tests for box validation (server + db), saving on both inserts, clearing paths, crop helper, zoomed card, fallback, open/close three ways, focus return, expired-link message, no photo. Then `bunx vitest related` on changed sources plus changed tests, and `bun run lint`.
