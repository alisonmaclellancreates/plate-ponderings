# Step 44: Real stories — add, check, and show on the plate page

## Data shape and state transitions

A story moves `pending → published | rejected`, exactly like a plate:

- Submit → validate (brief limits) → story AI check
  - pass → `published` with `published_at`, then request a fresh summary (step 45 stub)
  - fail → save nothing, return to step 1 with words intact + rejected copy
  - AI unavailable / shared AI block active → save as `pending`, author-only visible, pending outcome
- Recheck (extended from step 43) retries the person's pending stories, writes `story_published` / `story_rejected` notifications, and requests a fresh summary when one publishes.

Derived, never stored: plate status (Mystery / Interpreted / Owner weighed in), owner line, owner-first ordering.

## Source key rename (this step, per the brief)

The static pages use `knows` and `asked`; rename to `knows_owner` and `secondhand` everywhere: form options, mock data, previews, tests. On-screen labels don't change. Add a test that each of the four keys (`owner`, `knows_owner`, `secondhand`, `guess`) submits a value the database accepts.

## Database (proposed here, applied only after your approval)

Migration 1 — `stories` access:

- No browser insert on stories. Stories are written only by the `addStory` server function (admin client), as step 41 set up — a browser insert would let anyone write `status = 'published'` directly and skip the check, validation and rate limit. Keep the existing "author reads own pending/rejected" SELECT policy; no INSERT/UPDATE/DELETE policies, no INSERT grant to `authenticated`, no `anon` grants. Service role keeps ALL.
- New `story_save_attempts` table + `consume_story_save_attempt(uuid)` SECURITY DEFINER function, mirroring `subject_save_attempts` exactly: no browser grants, RLS on with no policies, execute revoked from public/anon/authenticated, granted to service_role only, advisory lock, `clock_timestamp()`, pinned search path. Index on `(user_id, attempted_at)`.
- `notifications.kind` already accepts text; `story_published` / `story_rejected` need no schema change.

## Server code

- `src/lib/story-moderation.server.ts` — `checkStory(meaning, more, plateText)` in the style of `checkSubject`: untrusted-data block, structured pass/fail, 402/403 block categories persisted to the shared `ai_check_*` settings, `STORY_CHECK_FORCE_UNAVAILABLE` test switch.
- `src/lib/stories.functions.ts`:
  - `addStory` (auth required): demo refusal with brief message; field validation per brief (meaning 3–80, source key one of the four renamed keys, more ≤500); plate must be published; rate limit 5 submissions per person per 15 minutes via `consume_story_save_attempt`, matching plates; shared AI block read; check → published/pending/rejected outcomes; on publish, call `requestSummaryRefresh(subjectId)` — a clearly named stub in `src/lib/summary-refresh.server.ts` with a test that it is called (step 45 fills it in).
  - `getPlateStories`: the visitor's identity comes only from their verified session on the server, never from a parameter. Signed out: published stories only, no pending panel, no block filter. Signed in: also their own pending stories (private panel) and their block list applied. Published stories for a published plate, owner story first then oldest first by `published_at`, five at a time with offset paging; returns only display fields (id, meaning, source key, body, author handle, heart count via `story_heart_counts`, published_at), plus derived status strip data (published count, owner handle or "No owner yet"). Test that one person can't get another's pending stories.
- Extend `recheckPendingSubjects` to also recheck the person's pending stories: same block/interval gates, `checkStory` per story, publish/reject + notification, summary refresh request on publish.

## Pages (existing previews stay the design)

- `src/routes/_authenticated/story.$step.tsx` becomes a real three-step flow keyed by plate id (search param), replacing mock `PLATES` data: step 1 form (owner note when the plate already has an owner story and `owner` is picked), step 2 photo step offers only "continue without a photo" (upload UI hidden until step 49), step 3 review of the real entered values. State carried in the component tree, not the URL. Signed-out visitors are sent to sign in and returned to the form for that plate (existing gate). Demo mode: form visible, all controls disabled, brief's disabled-form message.
- Outcomes: published → "Story submitted!" copy; pending → "Your story is being checked."; rejected → back to step 1, fields still filled, rejected banner. "Add a story" is offered only on published plates.
- `RealPlateDetail`: status strip (count, derived status, owner line), private pending panel with brief copy above the list, story cards (meaning title, source badge, optional text, current handle, heart count), owner story first with its highlight and marker, "Show 5 more" keeping scroll position, empty-plate invitation unchanged. Static `PlateDetail` previews keep mock data.

## Analytics

`story_started` and `story_submitted` (properties: source key, `has_more_text`, outcome ∈ published/pending/rejected/rate_limited/error — the last two matching `subject_spotted`, so a pause or failure is recorded as what it is) added to the event registry; never meaning or story text. Tests cover capture, both extra outcomes, and the never-send list.

## Tests

- `tests/lib/story-moderation.test.ts` mirroring the plate-moderation suite (untrusted-data block, outcomes, block categories, force switch).
- `tests/lib/stories.functions.test.ts`: validation, each check outcome, demo refusal, rate limit, summary-refresh call on publish, ordering (owner first, then oldest), second owner claim renders as a normal story, blocked-author filter, private pending panel contents, paging, session-only identity (no cross-user pending reads).
- Recheck extension tests: pending story publishes/rejects with notifications, stops on unavailable and on block.
- `tests/db/story-attempts.sql` mirroring subject-attempts, plus a test that a signed-in user cannot insert into `stories`; rerun every file in `tests/db`.
- Component tests for the wired flow and real plate page.

## Verification and ground rules

- `bun run lint` before finishing; fix anything in changed files.
- Full suite + coverage gate; report the PR Codecov figure (not local) once a PR exists.
- Commit to the current branch; you handle branches and PRs.
- Report only what was actually run.
- Photos, hearts, reporting, blocking controls, and the summary itself stay out of scope (steps 45, 48, 49).
