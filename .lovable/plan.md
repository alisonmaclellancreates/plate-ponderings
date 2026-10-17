# PR #113: approve migration 0017

## Proposed database change

Add the same per-user/time index used by story-save attempts, without changing 0016, permissions, rate limits or application behavior.

```sql
CREATE INDEX IF NOT EXISTS photo_detect_attempts_user_time ON public.photo_detect_attempts (user_id, attempted_at);
```

## Approval boundary

The exact SQL is staged at `docs/proposed-migrations/0017_step49_photo_detect_attempts_index.sql`. The managed migration directory is read-only; the migration tool creates the numbered file and applies its SQL together. Neither action has run. Approval is required before creating/applying 0017.

After approval, submit the staged SQL unchanged through the migration tool with name `step49_photo_detect_attempts_index`, confirm the resulting migration is 0017, then run `tests/db/photo-detect-attempts.sql` with its new index-existence assertion. Its rollback-only fixtures must leave no data behind.

## Already completed

- `AddStoryFlow.tsx`: effect keyed on the confirmed preview URL releases the old URL on clear/change and unmount.
- Tests cover removal, replacement through remove/reselect, failed no-save submissions, and unmount, while keeping the URL alive across review/back navigation.
- Requested related tests: 66 passing across 7 files. Local AddStoryFlow coverage: 100% statements, branches, functions and lines. Lint: zero errors, six existing warnings. Automatic build OK.
- Replied to both Copilot comments on PR #113 through Alison's GitHub connection.
- Current PR Codecov reports all modified coverable lines covered (100%), updated 19:07 UTC, before this follow-up. Fresh follow-up Codecov remains pending managed sync and CI; no manual push was performed.