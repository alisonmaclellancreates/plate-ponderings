# Step 46: real Plate of the Day and featured archive

## Data shape and transitions

An existing `featured_days` row represents an immutable selection: UTC date, plate ID and published-story count at selection. Current counts and status remain derived from published human stories.

```text
today has a saved pick -> reuse it
otherwise -> eligible zero-story plates -> random pick
          -> none -> eligible fewest-story plates -> pick
          -> none -> no pick, omit homepage band
save once -> every visitor reads the same daily row
```

Eligible means published and not featured in the preceding 30 UTC dates, including exactly 30 days ago. Historical picks are never recomputed. Counts ignore pending, rejected, hidden and deleted stories and fictional guesses.

## Proposed database changes, awaiting approval

No new tables, seed rows or new constraints. The existing `featured_days` primary key on `day` already enforces one pick per date. Preserve RLS and browser-denied grants on server-only tables.

Add three service-only functions, each `SECURITY DEFINER`, `SET search_path = public, pg_temp`, execute revoked from `PUBLIC`, `anon` and `authenticated`, granted only to `service_role`:

1. **`pick_featured_subject_for_today()`** returns `day`, `subject_id`, `stories_at_pick`, or no row. Derive UTC date inside the database, with no caller-supplied date or candidate. Acquire a transaction-scoped advisory lock for that date, re-read the existing pick, then select and insert only if absent. Choose randomly among eligible zero-story plates; otherwise choose the minimum published-story count with a random tie-break. Retain `ON CONFLICT (day) DO NOTHING` and read the winning row as a second concurrency safeguard. Save the count from the selection query.
2. **`get_featured_subject_days(_before date, _limit integer)`** returns bounded, newest-first published featured rows: date, plate ID, jurisdiction name, display text, count at pick, current published count and derived owner-claim status. A strict date cursor supports archive pagination without exposing arbitrary table reads. Exclude future dates and unpublished plates; no private identifiers, story bodies, handles or guess text.
3. **`get_visible_summary_versions(_subject_id uuid)`** returns only that published plate's visible versions, newest first: version, text, disagreement score, story count, started time and generated time. Filter inside the database using the existing `is_summary_public(id)` predicate unchanged. Do not duplicate or reinterpret its hide/unhide rules.

**Access assumption:** today's shared selection is system work, not a user-owned submission. Signed-out visitors and demo viewers may read it through the public server function; they cannot choose the date, plate or count and have no database write grant or callable database RPC. No new account-owned write path or AI call is introduced.

## Existing pages and data flow

- Add bounded public server functions and typed featured DTOs, with service clients loaded inside handlers. Route loaders use TanStack Query `ensureQueryData`; consumers use matching suspense queries. Distinguish read errors from a legitimate empty collection.
- Wire `/` to today's pick and the shelf covering the four calendar dates immediately before today, newest first. Missing days remain missing, rather than backfilling with older dates. Keep all other homepage sections when no pick exists.
- Wire `/explore` to real featured days, today's first with Today, 12 per batch and Load More. Preserve the existing grid, focus transfer and filter-free layout. Use feature date as row key because a plate can appear again after 30 days.
- Keep mock-backed preview pages intact. Adapt the shared featured card and daily band to a small display model rather than inventing fake stories to satisfy `PlateRecord`.
- Preserve layout, assets, styling, accessible link names and existing route metadata. Cards link to the real plate ID. No consensus badge is added: the current card has none.
- Progress: zero now always reads Still a mystery; zero at pick then one/many uses Was a mystery, now 1 story / N stories; otherwise Had K story/stories when featured, now N.
- Use the brief's daily invitation with Alison's approved singular override: Only 1 story so far, plural stories from 2 up. Never classify a plate with published stories as a mystery.

## Summary reads and analytics

- Replace the summary-table read and per-version RPC loop in `getPlateSummary` with one visible-version RPC. Preserve current/earlier mapping, catching-up detection and existing after-response refresh. Foreground database calls no longer grow with summary-version count.
- Add `featured_subject_opened` with exactly `is_mystery` and `days_ago`, today = 0. Capture when opening the daily plate or a featured card, deriving properties from that featured row and its UTC date. Preserve privacy filtering in capture and `before_send`.
- Leave `explore_filtered` out of the registry entirely, as Alison specified. No filters are introduced.

## Tests and verification

- Test every new branch: daily stability, UTC boundaries, 30-day exclusion, random mystery pool, fewest-story fallback, empty pool, immutable snapshot and concurrent-winner behavior; all progress cases including singular/plural; cursor pagination, missing shelf dates, real destinations and event privacy. Mock any existing AI dependencies.
- Extend rollback-only `tests/db/summary-visibility.sql` to compare batch results with the original predicate for hidden/unhidden stories, ordering, subject isolation, unpublished subjects and permissions. Add rollback-only daily-pick database tests for selection and service-only access. Assert fixed summary-read call counts with many versions.
- Run only new/changed test files and `bun run lint` locally. Run every database test through the database tool after migration, with before/after fixture checks. Report any concurrency check that cannot be exercised with two actual sessions as unverified, not as a live pass.
- Do not run local full-suite coverage, typecheck, build, browser, built-server or real-AI checks. CI and PR Codecov are authoritative; target 100% patch coverage without estimating it.
- Stay on the current branch with managed commits; Alison handles branches and PRs. Reports stay within 10 lines. No unrelated changes.

Approval authorizes these three functions and the page/test wiring. No schema or application changes before approval.
