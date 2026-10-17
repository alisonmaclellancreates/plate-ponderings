# Step 47: Your Submissions, made real

## Data shape (no database changes proposed)
The existing schema already covers this step:
- `subjects.created_by` and `stories.author_id` own the rows; owner SELECT policies exist for pending/rejected.
- `notifications` (read own; update `read_at` only, refused for demo by policy) already receives rows from the recheck and spot flows.
- No browser DELETE grant on subjects, stories or notifications. That absence is the database's refusal for dismiss; dismiss runs in an authenticated server function.

Row state machine (derived per record):
```text
subject: pending -> published (count = published stories, View)
                 -> rejected  (Dismiss)            ; pending: no action, no chevron
story:   pending -> published (own hearts, View)   ; pending on published plate: View
                 -> rejected  (Dismiss)            ; hidden/deleted: excluded
```
"Updated" = an unread notification whose story_id (stories) or subject_id with no story_id (subjects) matches the row.

## Server functions (new `src/lib/submissions.functions.ts`, all `requireSupabaseAuth`)
- `getSubmissions`: reads the caller's subjects and stories (owner-scoped), excludes hidden/deleted, merges newest first (`created_at`), attaches published story counts and the story's own heart count (existing `story_heart_counts` pattern via admin, counts only), unread flags. Returns plain DTOs with display text, jurisdiction name, status, action, updated, plus `unreadCount`.
- `markSubmissionsRead`: no-op for the demo role (checked server-side); otherwise updates the caller's unread notifications as the user, so RLS also refuses demo.
- `getUnreadDot`: boolean, any unread notification for the caller.
- `dismissSubmission({ kind, id })`: refuses demo with the brief's demo message; verifies via the user client that the row is the caller's and `rejected`; then with admin deletes its notifications, its photo from storage (story `photo_path`), and the row. Subject dismiss also removes any rejected stories' photos tied to it (none can be published).

## UI
- `/submissions` route: loader-free on the client (`useSuspenseQuery` under `_authenticated`), passes live rows into the existing `SubmissionsPage` layout unchanged; previews keep mock data. Dismiss removes the row optimistically and invalidates the query; demo sees the demo message.
- After the list renders: fire `submissions_viewed { unread_count }`, then call `markSubmissionsRead` and invalidate the dot query (labels stay on this visit, clear next visit).
- SiteHeader profile icon: small dot when `getUnreadDot` is true (signed in only).
- Rename mock `knows`/`asked` untouched; copy strings come from the brief.

## Analytics
Register `submissions_viewed` with `unread_count: number` only; test it carries no never-send fields.

## Tests (AI mocked, every branch)
Server functions: each row type and action, hidden/deleted excluded, subjects never carry hearts, updated mapping, demo mark-read no-op, non-demo mark-read, dismiss refusals (demo, not owner, not rejected) and success deleting notifications, photo and row. Components: each row renders right details/action, no chevron for pending subject, dot on/off, viewed event and mark-read order. Then run changed test files, lint, and rerun every `tests/db` file (no schema change, run for safety only if you want; default: skip since database unchanged).

## Report
Max 10 lines; Codecov after your PR.
