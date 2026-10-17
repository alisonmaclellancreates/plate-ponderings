# PR #113: approve migration 0017

## Proposed database change

Add the same per-user/time index used by story-save attempts, without changing 0016, permissions, rate limits or application behavior.

```sql
CREATE INDEX IF NOT EXISTS photo_detect_attempts_user_time ON public.photo_detect_attempts (user_id, attempted_at);
```

## Approval boundary

Alison approved at 19:27 UTC. The migration tool applied the exact proposed statement as `drizzle/migrations/0017_step49_photo_detect_attempts_index.sql`; the managed file adds only a trailing newline. Database readback confirms btree `(user_id, attempted_at)`.

`tests/db/photo-detect-attempts.sql` passed through the privileged database tool, including the new index-existence assertion. Readback confirms zero remaining test attempts. No further local coverage runs, per Alison's instruction.

## Already completed

- `AddStoryFlow.tsx`: effect keyed on the confirmed preview URL releases the old URL on clear/change and unmount.
- Tests cover removal, replacement through remove/reselect, failed no-save submissions, and unmount, while keeping the URL alive across review/back navigation.
- Requested related tests: 66 passing across 7 files. Local AddStoryFlow coverage: 100% statements, branches, functions and lines. Lint: zero errors, six existing warnings. Automatic build OK.
- Replied to both Copilot comments on PR #113 through Alison's GitHub connection.
- Current PR Codecov reports all modified coverable lines covered (100%), updated 19:07 UTC, before this follow-up. Fresh follow-up Codecov remains pending managed sync and CI; no manual push was performed.