# Step 51: Real demo, reproducible seed content, and removal of scaffolding

## Outcome and boundaries
The sample account browses the same live pages as contributors without changing anything. An admin can replace event content with the exact scenario in `docs/seed.md`, then fill missing fictional guesses in bounded batches. Existing live layouts, styling, accessibility, and approved copy stay intact.

Work stays on the current branch. No unrelated fixes, auth-method changes, colour changes, or AGENTS.md edits. Approval authorizes schema/code work, not running the destructive reset against current content or making real AI calls.

## 1. Demo identity and access
- Wire `/demo` into server-side password sign-in using `DEMO_EMAIL` and `DEMO_PASSWORD`. Check demo mode first, verify the returned account has the demo role and `Traveler4821` handle, and return only the session needed for browser sign-in, never credentials. Use an isolated non-persisting auth client; do not overwrite the service client's session. Missing configuration or invalid sample identity fails safely.
- Preserve the demo introduction; Start the Demo enters live browsing. Remove `/demo-form` as a static sample, not the real `/demo` entry.
- Use verified account roles for the header. Exit Demo signs out to `/`; failed exit retains the menu and existing error feedback. Ordinary member sign-out behavior stays unchanged.
- Mount the brief's banner once in the shared layout for a signed-in demo account, with its visibility governed by demo mode. Demo mode has no effect on email or sign-in methods.
- Audit server and deployed database refusals for handle saves, account deletion, plate spotting, story submission/deletion, photo detection/upload, hearts/unhearts, reports, blocks/unblocks, dismissals, notification marking, rechecks, and admin writes. Demo refusal occurs before side effects, including photo deletion on a refused story. A caller with both demo and admin roles cannot mutate anything.
- Keep the sample excluded from own-account and admin rechecks; automatic submission viewing never marks its notifications read. Deliver the full refusal matrix in `docs/step51-demo-write-audit.md`, distinguishing RLS denial from absence of browser policies/grants.

## 2. Proposed database changes, awaiting approval
Next migration number is **0019**, following applied 0018. Existing migrations remain untouched. No new public read policy or browser write grant.

- Add `app_settings.demo_today date NULL`, without a default or data update. It changes nothing until Alison sets it.
- Add one service-only `effective_today()` function: return `demo_today` only when demo mode is on and that date is set; otherwise return the actual UTC date. All application callers obtain today from this function, rather than duplicating the decision in JavaScript.
- Update the existing picker and featured archive RPCs to use that same effective day. Preserve the current atomic daily lock, immutable saved picks, selection criteria, ordering and cursor limits. While frozen, return the saved pick only; if it is absent, return no pick instead of creating one. Archive reads exclude days after the effective day.
- Add service-only relational reset support with a strict typed seed payload. It rechecks demo mode, serializes relational replacement, deletes only the named content tables in dependency order, and inserts the complete seed rows in one transaction. No Auth or Storage schema writes. Any insertion failure rolls back relational replacement.
- Harden story/subject attempt-consumption functions to refuse demo users before inserting an attempt, matching existing handle/photo protection. Confirm current grants and policies first; the historical Storage policies were removed by migration 0002, so do not restore them.
- Every new function has a fixed search path, revoked PUBLIC/anon/authenticated execution and explicit service-role execution. Existing RLS stays enabled. Validate against existing rows and test effective-day/frozen-picker behavior and service-only access in rollback transactions.

## 3. Exact seed scenario and reset safety
- Use `docs/seed.md` as the literal seed source, not existing fixtures: 16 plates (15 published, 1 pending), 18 published stories plus the sample's pending/rejected stories, all 10 summary versions, prescribed hearts, five featured dates, one report, and two unread sample notifications. Preserve exact story text and source claims; do not run seed stories through AI or apply contributor-form framing to rewrite them.
- Keep admin accounts, the configured sample account, and all app settings. Recreate the ten other seed accounts through the server with random passwords never logged, displayed, or saved in readable files. Remove other non-admin accounts through the Auth admin API, never direct SQL against managed Auth tables.
- Clear only subjects, stories, story photos, summaries, hearts, reports, blocks, notifications, featured days, subject guesses, and summary runs. Account profile/role removal happens only as part of deleting accounts. Jurisdictions, rate-limit attempt tables and all other unnamed tables stay untouched.
- Hide Reset seed data and Fill missing guesses while demo mode is off; every server entry verifies non-demo admin access and rechecks the mode before any destructive step. Validate secrets, sample identity and bundled media before deletion.
- Reset requires a first destructive confirmation and a second dialog where the admin types exactly `RESET`. Cancel never calls the reset function.
- Auth, Storage and database changes cannot share one transaction. Make the sequence retryable and fail at the first error with a clear incomplete-reset result, never claim cross-service rollback or success until counts/storage read back correctly. Repeating a successful reset leaves the same dataset and exactly five photos; serialize concurrent reset requests with database-backed coordination rather than in-memory state.
- Seed dates are offset from configured demo_today, preserving Pacific-time story/summary timestamps and the four previous featured days. The sample's credentials, identity and existing account are not replaced.

## 4. Seed photos and guesses
- **First change completed:** moved the five originals to `docs/seed-photos/` and deleted their five measuring copies. All originals are 1600 × 1200.
- Add a build-time processing script that reuses the existing canvas recipe: downscale by 24 and smooth back up outside the sharp plate box, JPEG quality 0.9, longest side ≤1600 and ≤4 MiB. Preserve the five exact fractional boxes from the seed document. Processing does not use detection or real AI.
- Commit processed JPEGs beside server code and bundle their bytes server-only. Originals stay exclusively in the source-photo directory; never serve/upload them. Image processing runs before deployment/runtime, never during Reset.
- Reset uploads processed JPEGs into each seed author's UUID folder with a fresh UUID `.jpg` basename, then saves the path and box on the associated published story.
- Fill missing guesses awaits up to five existing `requestPlateGuess` calls sequentially, checks the shared pause before each, preserves saved guesses, leaves failures missing, and reports the remaining count. It does not dispatch unbounded after-response work.

## 5. Remove preview scaffolding without removing live behavior
- Move domain types and genuine shared copy/helpers out of `mock-data.ts` before deletion. Keep `featuredProgress` in `featured.ts`; delete `previewFeatured` and fixture adaptation, eliminating the cycle.
- Remove all preview-only routes and sample aliases, including `/previews`, component galleries, home variants, static story menus/outcomes, fixture-backed plate aliases and fallback story steps. Keep valid live public/protected routes and real-condition success, pending, rejected and error states.
- Remove fixture defaults and sample-only branches in shared live components, then delete `src/lib/mock-data.ts` and `public/mock/`. Search all source imports and links before deleting their targets. Do not change generated routing or generated preview-host authentication files.
- Delete tests belonging solely to removed preview surfaces. Migrate retained live tests to explicit test-owned fixtures and real DTOs, preserving behavioral/accessibility coverage. No production sample rows remain.
- Inspect retained content-route metadata, including index, preserving unique app-specific titles and descriptions.

## 6. Analytics and verification
- Register `demo_started`, `demo_exited`, and `demo_write_refused` with only `action` for the refusal event. Emit start/exit only after successful transitions, and refusals only for an actual verified refusal. Automatic skipped rechecks/read marking are not user write attempts. Preserve the never-send filter and test credentials/content are excluded.
- Tests cover each demo boundary, frozen/off/unset dates, reset off-mode/non-admin/dual-role refusal, confirmation cancellation, unrelated content removal, preserved admins/settings/sample identity, exact seed counts and histories, photo boxes/paths, repeated reset, partial failures/retry, concurrent reset coordination and capped sequential guess fill with mocked AI.
- Run `bunx vitest related --run` on every changed source file and changed test file, then `bun run lint`; fix errors in changed files. No local full suite, coverage, typecheck, build, live browser or real-AI checks.
- After approved migrations, rerun the existing database tests (including step 41 visibility checks) and new demo/reset tests through the database tool inside rollbacks; verify no fixtures remain.
- Report only executed checks, at most 10 lines, with the audit document and any credential/setup blockers. CI and actual PR Codecov remain authoritative; managed Git sync owns commits, with no branch changes or manual Git mutations.

## Alison's setup after implementation
Approve the proposed migration; create/identify the sample account, set its handle and demo role, set `DEMO_EMAIL` and `DEMO_PASSWORD`, retain/create the admin account, set demo_today to **2026-10-17** and enable demo mode. After recording the real-account walkthrough, explicitly run Reset seed data, then click Fill missing guesses until zero remain. Live reset and real AI results remain Alison's verification unless separately requested.
