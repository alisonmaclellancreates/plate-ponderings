# Step 46: real daily pick, featured shelf and archive

- [x] Rowan sign-off changes: Recently Featured hidden entirely (heading, intro, link) with no earlier featured days, proven by a new test; Roadside Archive intro replaced with the approved sentence. 29 changed tests passed across two files; changed-file lint clean; formatting passed.
- [x] Added sample-only unnested /previews/explore and /previews/homepage-featured, real grid/bands/shelf and live-page notes. 35 changed tests passed across five files; lint zero errors/six existing warnings; formatting passed; automatic build OK. No database, browser or AI checks.
- [x] Contain featured read failures: omit homepage bands; Explore retries inline, including later-page failures. All 37 changed tests passed; repository lint zero errors/six existing warnings; formatting passed; automatic build OK. No database, browser or AI checks.
- [x] Alison approved the plan and three service-only functions; singular daily copy retained and explore_filtered excluded entirely.
- [x] Applied approved migration 0013; built atomic UTC selection, live featured pages, batch visible-summary reads and privacy-scoped analytics.
- [x] Changed tests: 96 passed across 10 files. Lint: zero errors, six existing UI warnings. All seven database test files passed through the privileged tool; fixture readback zero. Automatic build OK; no manual full suite, coverage, typecheck, build, browser or AI checks.
- [ ] Two-session concurrency is unexercised; requires an independent privileged multi-session harness. Daily reuse, immutable snapshot and single-row behavior passed in one transaction.
- [ ] Report PR Codecov patch after Alison opens the Step 46 PR. CI is authoritative; no local coverage estimate.

# Step 45b: fictional plate guesses

- [x] Alison approved the plan and subject_guesses table; applied migrations 0011 and 0012 (insert-only service grants).
- [x] Complete the approved Step 45b build and local verification on the current branch.
- [x] Revise the plan for explicit openai/gpt-6-astra using the summary's streamed structured low-reasoning shape, and at most 3 gap-fill guesses per recheck with a cap test and pause checks before each.
- [x] Build nonblocking publication generation, own-plate recheck gap fill, server-derived reveal, teaser/panel and no-property analytics; mocked behavioral tests.
- [x] Run bun run lint (0 errors, 6 existing UI warnings), bun run test:coverage (913 tests / 137 files), tsgo and targeted Prettier checks; automatic build OK. All six tests/db files passed through the database tool, with zero fixtures left.
- [x] Local browser: Rowan published RHYME45B, one real Astra guess saved; hidden RPCs omitted text, first human story revealed the guess, returning to zero published stories hid it despite a pending story. Screenshots inspected at 1280px and 360px, no overflow or page errors. Removed verification content and read back zero dependent rows.
- [x] Verification boundary recorded: no workerd execution or published-site verification ran; gap fill and failure/pause paths used mocked tests, not live AI. Managed commit recorded on the existing branch.
- [ ] Read PR Codecov patch figure after Alison opens the PR. Blocker: PR not open.

# Rowan: summary prompt review

- [x] Preserve the brief’s score table, match Rowan’s score/text instruction verbatim, and add the attributed-ownership rule with instruction tests. No schema or existing-summary edits.
- [x] Run summary-generation tests: 15 passed. Changed-file ESLint: clean.
- [x] Generate one fresh ROW43XYZ summary through the normal flow as Alison’s selected Rowan account. Story submission published; version 5 read back through the database tool and plate UI, based on 5 stories, score 72 (Opinions differ), ownership attributed without evidence language. Existing summary rows untouched.

# Step 44c: stale or stuck sessions

- [x] Implement shared bounded user check, late account recovery, rejected-session cleanup and bounded project-owned attachment. No database changes; generated attacher unchanged.
- [x] Add behavioral tests and run full coverage suite: 825 tests across 129 files passed, session helpers and account provider at 100% locally. `bun run lint`: zero errors, six existing UI warnings; automatic build OK.
- [x] 44c review fix: route guard waits up to 8 seconds (GUARD_TIMEOUT_MS) before treating a visitor as signed out; attacher and account context keep the 1-second limit. New test: a check resolving after 2 seconds lets the visitor through. 826 tests across 129 files passed; typecheck clean; lint zero errors, six existing UI warnings; build OK.
- [x] Repeat seven browser saved-state search scenarios: every search reached no-match, including stalled renewal in 1.87s; rejected session cleared, timeout retained session, actual PostHog persistence corrupted without blocking search. Zero page errors; result screenshots inspected.
- [ ] Confirm 100% PR Codecov patch coverage. Blocker: Alison opens the PR; local coverage is diagnostic only.

# Step 44: real stories — add, check, show on plate page

Status: implemented and verified locally. 735 tests pass, typecheck clean, lint clean (6 pre-existing UI warnings), coverage 99.03/97.26/98.14/99.4, build OK. Codecov PR figure pending: Alison opens the PR. No further schema changes without Alison's approval.

- [ ] Plan approved, incorporating Alison's four changes: server-only story writes (no browser insert policy or grant; DB test that a signed-in user cannot insert), source keys renamed to knows_owner and secondhand everywhere with a test that each key is accepted, getPlateStories identity from verified session only (test that one person can't read another's pending stories), and a 5-per-15-minute story rate limit matching plates. Addition: story_submitted outcomes also include rate_limited and error, matching subject_spotted, with tests for both.
- [ ] Propose stories migration (RLS, story_save_attempts, consume function) and wait for Alison's approval before applying.
- [ ] Build story moderation, addStory, getPlateStories, recheck extension, wired three-step flow, real plate page stories, analytics events, tests; rerun tests/db; lint; report PR Codecov.

# Step 11: GitHub CI and Codecov

# Step 43c: shared plate detail frame

- [x] Approve the presentation-only PlateFrame plan.
- [x] Extract the existing frame and show every full jurisdiction beneath the plate, aria-hidden, in both detail pages only. Source check confirms one frame markup owner and two consumers; Plate and other render locations untouched.
- [x] Test shared frame and both consumers with the real Plate, including Newfoundland and Labrador and Utah and exclusion of the added line from accessibility.
- [x] Browser-check published ROW43XYZ through normal lookup and /plate/ut-canyons at 1280px and 360px. Screenshots inspected: complete names, no overflow; normal word wrapping enabled, names fit on one line at both tested widths. Accessibility tree omits the added line; existing heading and named Plate preserved. Preview-long and real-short combinations are unit-tested only. No browser data injection or app fixture mechanism.
- [x] Run bun run test:coverage: 671 tests / 121 files pass and configured coverage thresholds hold. Run bun run lint: zero errors, six unchanged UI warnings, no findings in changed files. Automatic build OK. Managed commit 08f8108 recorded the implementation without switching branches.
- [ ] Confirm 100% current PR Codecov patch coverage. Blocker: GitHub open-PR read returned no open pull requests; no Step 43c PR figure exists to report yet. Local diagnostics are not a substitute.

# Step 43b: retired columns and missing index only

- [x] Confirm no active code or tests read the deprecated handle_check_* columns; matches outside generated types are historical migrations and documentation only.
- [x] Apply isolated drop migration 0006; no other statements included.
- [x] Apply separate index migration 0007; types automatically regenerated and contain no retired columns.
- [x] Database readback: app_settings has id, demo_mode, ai_check_block_category, ai_check_blocked_at, ai_check_run_id; subject_save_attempts_user_time is btree (user_id, attempted_at).
- [x] All three DB tests pass. Initial summary test invocation had a transcription UUID error; corrected invocation passes all original assertions. App suite: 665 tests / 120 files pass; configured 95% coverage thresholds pass. Lint: zero errors, six unchanged UI warnings. Automatic build OK; no behaviour or page changes.
- [x] Automatic local commits verified: 9b55a33 (drop), 78037bd (generated types), d3f069a (index); no manual git mutations or branch changes.
- [ ] Confirm GitHub sync and current PR Codecov gate after CI; remote result has not been read for Step 43b and local diagnostic coverage is not a substitute.

# Step 43: Copilot pending feedback and pause analytics

- [x] Retain submitted plate values; behaviour tests verify search arrivals, direct /spot submissions and edits to prefilled values, including retained fields and Back to Search destinations.
- [x] Allow and capture subject_spotted outcome rate_limited; capture and before_send tests pass. Full suite: 665 tests across 120 files, changed-file lint clean, automatic build OK. PR Codecov remains unconfirmed for this follow-up; latest previously read figure is 75.09%, not the local diagnostic coverage.

# Step 43: PR #90 coverage correction

- [x] Add real moderation, server error/race/recheck, route and UI edge tests; no production code or branches removed. Force-unavailable switch unset in sandbox and absent from default configuration.
- [x] Run the full CI-equivalent coverage suite: 662 tests across 120 files pass; all seven requested files have zero missing statements or branches locally. Changed-file lint clean; automatic build OK.
- [ ] Read PR #90 Codecov after CI. Latest actual report read through Alison's GitHub connection is 75.09434% with 66 missing lines on the previous PR head; the new tests have not synced to that head yet. Await automatic sync and CI, never substitute the local diagnostic result.

# Step 43: Rowan rate-limit correction

- [x] Separate pause outcome using the unchanged wait message; live and preview outcome tests pass. All new executable lines covered locally; 581 tests pass.
- [x] Check the outcome at 1280px and 360px: clean wrapping, no horizontal overflow or browser errors, Go Back returns home. Changed-file lint clean; preview build OK. Jurisdiction display deferred.

- [x] Diagnose lint, ignore generated files, and format remaining files.
- [x] Run lint and coverage; inspect automatic build/typecheck signals.
- [x] Add parallel CI jobs, Codecov configuration, and README badge.
- [x] Verify workflow configuration and provide first-run checklist.
- [ ] Alison verifies GitHub connection, CODECOV_TOKEN, and the first successful run.

# Static previews

- [x] Shared foundation: brand tokens, fonts, icons, header, footer, plate, badges, mock data, preview index.

# Homepage corrections

- [x] Fix Plate of the Day shrinking layout and verify both variants plus Recently Featured at 375px.
- [x] Restore two-family typography and correct action-card colours.
- [x] Show both homepage variants in mobile view.

# Plate detail corrections

- [x] Correct pending copy and mobile photo placement.
- [x] Add a catching-up-only story, align summary history, and relocate mock photo.
- [x] Verify plate detail tests, mobile/desktop previews, and lint.

# Spot a Plate previews

- [x] /spot form and eight outcome previews, homepage search prefill, tests, lint.

# Add a story previews

- [x] /story/* nine Oregon PNW LV preview steps, tests, lint.

# Account previews

- [x] /submissions and /profile previews, tests, lint.

# Entry previews

- [x] /sign-in-prompt, /sign-in, /sign-up, /demo, /demo-form with signed-out and demo headers, tests, lint.

# Plate of the Day archive

- [x] Share featured cards and add 14 featured mock plates with every progress case.
- [x] Build /explore, working plate links, and Load More.
- [x] Verify tests, lint, and desktop/tablet/mobile archive flow.
- [x] Correct card accessible names, Load More focus, singular progress and hearts, and homepage plate destinations; verify tests, lint and browser flow.

# Remaining pages

- [x] /settings, /settings/delete-confirm, /story-menu, /admin, /about, /privacy, /contact, /not-found previews, tests, lint.

# Admin mobile and privacy wording

- [x] /admin table never scrolls the page sideways at 360px (overflow-x-auto container).
- [x] Privacy: update What we store, Photos, What the AI sees, and the Deleting title and first sentence.
- [x] Tests: privacy wording present, "That's it" gone, admin table in scrollable container; lint clean.

# Step 41: backend foundation

- [x] Migration: 12 tables, app_role enum, has_role, derived views, is_summary_public, story_heart_counts, GRANTs, RLS.
- [x] Private story-photos bucket with owner-folder storage policies.
- [x] tests/db/summary-visibility.sql: 7 assertions run and passing; fixtures cleaned up.
- [x] App unchanged: 431 tests, lint 0 errors, typecheck clean.
- [x] Alison's revision applied (migration 0002): no public reads, exact grants, is_story_published, self-block check, stable owner tie-break, no storage policies; summaries and jurisdictions server-only. Final DB state verified from the catalog: anon has zero grants on all 12 tables; authenticated has select on profiles/user_roles/subjects/stories/notifications, insert+select on reports, insert+select+delete on hearts/blocks, and update only on notifications.read_at (column-level); jurisdictions/summaries/featured_days/app_settings have no grants at all. Policies: 14 in public (listed in the step 41 report), zero on storage.objects. All four helper functions are SECURITY DEFINER. All 8 visibility assertions pass; app suite 431 tests green, lint 0 errors, typecheck clean.

# Step 41b: PostHog analytics

- [x] Add the typed, privacy-limited analytics module and route page views without changing page behavior.
- [x] Verify tests, coverage gate, lint, and preview event requests: 438 tests pass, coverage gate holds, lint 0 errors, build OK; decoded page views for / and /explore contain no query strings, both ingest requests return 200, no browser errors.
- [ ] Alison confirms page views arrive in PostHog.
- [x] Require an explicit analytics host with no default when connector region is absent; all analytics statements, branches, functions and lines are 100% locally. Full suite: 442 tests / 107 files pass; coverage gate holds; lint 0 errors / 6 existing warnings; build OK.
- [x] Verify Codecov patch coverage after CI. Alison confirmed 100% patch coverage for Step 41b.
- [x] Consolidate event definitions into one runtime registry; test-only second event passes capture and before_send with only listed properties and identifiers. All 439 tests / 107 files pass; coverage gate holds (99.35% statements, 98.31% branches, 99.44% functions, 99.74% lines); lint 0 errors / 6 existing warnings; build OK; real query-free page views accepted with HTTP 200.

# Step 42: accounts, handles and session-aware header

- [x] Return available/taken/unknown (null for demo); shared preview status rendering and stale/own-handle tests. Live Rowan session shows Traveler7444 taken beneath input without Save and own handle Available. 548 tests pass; all three changed source files 100% local coverage; focused lint clean.

- [x] Classify weak-password errors by reasons; actual AuthWeakPasswordError tests pass. Live signup returns 422 with pwned and displays the unchanged breached-password message. 541 tests pass; account-rules coverage 100%, touched-file lint clean, build OK.
- [x] Set and read back credit_block at 2026-10-17 06:12:55 UTC with test run marker; leave Resume to Alison. Preview and published share this setting.

- [x] Rowan review: 278px handle input at 360px with feedback below; actionable validation, truncated mobile header with full accessible name. 536 tests pass; maintained lint 0 errors/0 warnings, six existing UI warnings; build OK.
- [x] Grant Traveler3374 admin access and verify Handle check status: real account menu opens Admin, status reads Ready; handle remains Traveler3374 after save and reload.
- [x] Capture saved/rejected handle and password/account error review states, distinguishing live results from simulated provider responses; review PDF supplied with reproducible steps in docs/rowan-review.md.
- [x] Patch coverage: 533 tests pass; all eight reported files have 100% statement/branch/line coverage locally; no production branches removed. Maintained lint 0 errors/0 warnings; build OK.
- [ ] Patch coverage: re-read PR #86 Codecov after follow-up sync and CI. Blocker: latest completed CI predates these tests; current PR report remains 94.60154%, not a result for this follow-up. GitHub read access is verified.
- [x] Pre-merge: separate the account hook, resolve the provider effect dependency without suppression; maintained files have 0 errors/0 warnings, repository-wide 0 errors/6 existing UI warnings. All 509 tests pass; build OK; protected profile redirect verified.
- [x] Pre-merge: original desktop fixture auth user and SullyTest42 profile are absent; the handle-save attempts table is empty. Already deleted, no additional deletion needed.
- [x] Scope terminal blocks to handle moderation only; verified admin status/manual reset; safe logs and gateway quotes documented in docs/step42-report.md and AGENTS.md.
- [x] Approved plan revised; separate pause table removed; Traveler4821 excluded; five saves per 15 minutes enforced.
- [x] Approved database changes applied; validated constraints, privileges and rollback-only account tests checked.
- [x] Email/password signup, signin, signout and safe return paths verified in the running app.
- [x] Real profile, availability, moderated save/readback, demo refusal and session/role-driven header implemented and tested.
- [x] Privacy-limited account/handle analytics registry and filtering tests pass.
- [x] 507 tests pass; coverage 99.22/97.26/99.02/99.68 meets 95% gate; lint 0 errors/8 warnings; build OK; summary visibility and account DB tests pass; live admin reset verified; verification fixtures cleaned.
- [ ] Alison checks hosted HIBP and password minimum in More → Users → Auth settings. Blocker: supported independent hosted-setting readback unavailable.
- [ ] Confirm all five new events in PostHog. Blocker: event delivery not independently inspected; filtering is tested.

# Step 43: look-up and Spot a Plate on the real backend

- [ ] Plan approved, including the proposed migration (subject_save_attempts, profiles.last_recheck_at, handle_check_* renamed to ai_check_*).
- [ ] Search and /plate/$id read with the admin client inside server functions, returning only needed fields, never created_by.
- [ ] Simultaneous-spot unique-key conflict re-reads the key and returns exists/already-spotted/pending, never error; tested.
- [ ] Shared AI pause: app_settings fields renamed to ai_check_*; handle check, subject check and recheck all read/write it; blocked behavior per change list; /admin panel and account previews updated to "AI check status" copy; AGENTS.md recovery instructions updated.
- [ ] Search wiring, /plate/$id route, Spot a Plate outcomes, recheck trigger, 42b message constants and single-main previews fix.
- [ ] Analytics: subject_searched, subject_spotted; tests, DB test rerun, live verification.
- [ ] Test that Resume AI checks clears the block for every check, not only that one block stops the others.
- [ ] Confirm homepage look-up card moves keyboard focus to the first search field; test exists from static pages (Homepage.test.tsx), report as such.
- [x] Step 45: summary versions, visibility on server, after-response retry; addStory and recheck do not wait for the summary
