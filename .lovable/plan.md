# Step 48: story actions, admin, settings

## Data shape and state transitions

```text
story.status:  published --hide--> hidden --unhide--> published   (admin; published_at untouched)
               published|hidden --delete--> deleted (tombstone; meaning '', body null, photo null, removed_at now)
               pending|rejected --account delete--> row deleted
removed_at:    set to now() on hide/delete, cleared on unhide
               (is_summary_public already hides versions written from a hidden/deleted story
                whose published_at <= generated_at and removed_at > started_at, so versions vanish
                immediately and return on unhide; no SQL change needed)
```

Existing tables already have most rules: hearts PK (story,user) with a published-story insert policy, blocks PK plus no-self-block, reports unique (story, reporter), reason keys `personal_info | harassment | spam | other`. All carry non-demo policies.

## Proposed migration (needs your approval)

1. `reports.reporter_id` DROP NOT NULL, so account deletion can clear the reporter and keep the report. The tool flags DROP NOT NULL as destructive and asks before it runs.
2. `reports_note_length` CHECK (note is null or char_length(note) <= 200), added NOT VALID, then validated against existing rows in the same migration (there are currently zero rows).
3. `get_reported_stories()` security definer, service_role only. Returns story id, subject display, jurisdiction name, meaning, author handle, status, report count, reason keys and latest report time, newest first. Server reads stay fixed in count.

Nothing else: no demo triggers. The tombstone keeps `meaning` as '' instead of relaxing NOT NULL.

## Server functions (all authenticated; demo refused first, then DB policy refuses as a second layer)

- `stories-actions.functions.ts`: `toggleHeart`, `reportStory`, `blockAuthor`, `unblockUser`, `deleteMyStory`, `getBlockedPeople`. Heart, report and block writes go through `context.supabase` (RLS as the user, using the existing non-demo policies). Delete uses the admin client after an ownership-checked conditional update (`id`, `author_id`, status in published/hidden). It then removes hearts and the photo, and calls `runAfterResponse(requestSummaryRefresh)`.
- `getPlateStories` DTO gains `isOwn`, `hearted` and an opaque `authorKey` for Block. Raw author ids never reach the browser; Block resolves the author on the server from the story id.
- `admin.functions.ts`: `getReportedStories`, `setStoryHidden({ id, hidden })` and `recheckAllPending`. Each verifies `has_role(admin)` through `context.supabase` before loading the admin client. The recheck extracts the existing per-user loop into a shared server helper that takes the owner id, then runs it for all non-demo owners with pending rows. It returns a changed count. The existing per-user recheck keeps its cooldown.
- `account-delete.functions.ts`: `deleteAccount` runs the full sequence from the brief. It refreshes summaries for every affected subject, deletes the auth user and returns `{ deleted: true }`. Then the PostHog person is deleted with a server secret. A failure is logged, and deletion still succeeds.

## Pages

- Story card (live): a heart button with count and pressed state; signed out it navigates to sign-in with a return path. The menu follows the brief's rules: none signed out; Delete only on own published stories; demo sees the menu and gets the demo message. It reuses the existing Report and Delete dialogs.
- `/admin`: `beforeLoad` checks the admin role through an authenticated server read and redirects non-admins to `/`. The live table has Hide/Unhide and Recheck pending with its count message.
- `/settings`: a live blocked list with Unblock. `/settings/delete-confirm` deletes, sends `account_deleted`, calls `reset`, signs out locally and navigates home.
- `/privacy`: a PostHog third-party paragraph.
- Sample twins: `/previews/story-menu`, `/previews/admin`, `/previews/settings`, `/previews/settings-delete-confirm`. All use real components, inert actions and mock rows covering every state. The `/previews` list marks the live pages as live.

## Analytics

Registry additions: story_hearted, story_unhearted, story_reported [reason], user_blocked, user_unblocked, story_deleted, admin_action [action: hide | unhide | recheck], account_deleted. None of these carry text or handles.

## Secrets

`POSTHOG_PERSONAL_API_KEY` and `POSTHOG_PROJECT_ID` (server only). I'll request them with the secure form after approval. Until they're set, the PostHog delete logs "not configured" and the account deletion still succeeds.

## Tests and checks

- Unit tests for every action, including demo refusal, tombstone fields, admin-only access, the account-deletion sequence and PostHog failure, the redirects, the analytics events and each sample page.
- New `tests/db/story-actions.sql`: report note length, reporter-null retention, `get_reported_stories` grants, and versions hidden then restored by hide and unhide. Then rerun all of tests/db.
- Locally: `vitest related` on the changed source plus the changed tests, and lint.
- Redirects in the running preview: the admin redirect for a non-admin and the signed-out redirect, via Playwright, as the brief requires.

## Technical notes

- Redirects only in `beforeLoad`; server functions return values. `src/start.ts` is untouched.
- Hidden/deleted stories are already excluded from public story reads by status.
