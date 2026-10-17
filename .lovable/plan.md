# Step 47: Your Submissions, made real

## Data shape (one database change proposed)
- `subjects.created_by` and `stories.author_id` own the rows.
- `notifications` (read own; update `read_at` only, refused for demo by policy) already receives rows from the recheck and spot flows.
- No browser DELETE grant on subjects, stories or notifications. That absence is the database's refusal for dismiss; dismiss runs in an authenticated server function.
- Proposed migration: `notifications.subject_id` and `notifications.story_id` foreign keys become `ON DELETE CASCADE` (drop and re-add the two constraints, same columns). Today they have no cascade, so a conditional row delete would fail while notifications still point at it. With cascade, the row delete itself removes its notifications, which is exactly "only when a row was deleted". Existing rows already satisfy the constraints; validated after apply.

Row state machine (derived per record):
```text
subject: pending -> published (count = published stories, View)
                 -> rejected  (Dismiss)            ; pending: no action, no chevron
story:   pending -> published (own hearts, View)   ; pending on published plate: View
                 -> rejected  (Dismiss)            ; hidden/deleted: excluded
```
"Updated" = an unread notification whose story_id (stories) or subject_id with no story_id (subjects) matches the row.

## Server functions (new `src/lib/submissions.functions.ts`, all `requireSupabaseAuth`)
- `getSubmissions`: reads with the admin client, filtered by the verified `context.userId` (`created_by` / `author_id`), for every status, so published rows appear regardless of owner policies. Excludes hidden/deleted stories, merges newest first, attaches published story counts (subjects) and the story's own heart count (stories), unread flags. Returns only the planned fields: id, kind, display text, jurisdiction name, status, date, count, action, plate link, updated, plus `unreadCount`.
- `markSubmissionsRead`: no-op for the demo role (checked server-side); otherwise updates the caller's unread notifications as the user, so RLS also refuses demo.
- `getUnreadDot`: boolean, any unread notification for the caller.
- `dismissSubmission({ kind, id })`: refuses demo first with the brief's demo message. Then one admin delete carrying every condition (`id`, owner = `context.userId`, `status = 'rejected'`) with `.select("id, photo_path")`. Only when a row comes back: remove its photo from storage (notifications go with the row by cascade). No match returns a not-found result and touches nothing else.
- Recheck: when `recheckPendingSubjects` resolves on the client, invalidate the unread-dot query so a status change it creates shows the dot without a page change.

## UI
- `/submissions` route: loader-free on the client (`useSuspenseQuery` under `_authenticated`), passes live rows into the existing `SubmissionsPage` layout unchanged; previews keep mock data. Dismiss removes the row optimistically and invalidates the query; demo sees the demo message.
- After the list renders: fire `submissions_viewed { unread_count }`, then call `markSubmissionsRead` and invalidate the dot query (labels stay on this visit, clear next visit).
- SiteHeader profile icon: small dot when `getUnreadDot` is true (signed in only).
- Rename mock `knows`/`asked` untouched; copy strings come from the brief.

## Analytics
Register `submissions_viewed` with `unread_count: number` only; test it carries no never-send fields.

## Tests (AI mocked, every branch)
Server functions: published, pending and rejected rows all appear (subjects and stories), each row type and action, hidden/deleted excluded, subjects never carry hearts, only planned fields returned, updated mapping, demo mark-read no-op, non-demo mark-read, dismiss demo refused before any delete, dismiss no-match (no photo removal), dismiss success removing the photo. Components: each row renders right details/action, no chevron for pending subject, dot on/off, dot query invalidated after the recheck resolves, viewed event and mark-read order. A `tests/db` addition proves deleting a rejected story or subject cascades its notifications. Then run changed test files, lint, and every `tests/db` file.

## Report
Max 10 lines; Codecov after your PR.
