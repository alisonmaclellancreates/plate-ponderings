# Step 11: GitHub CI and Codecov

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

- [ ] Patch coverage: add behaviour tests for server refusal/error paths and all eight reported files; reach 100% locally without removing viable branches.
- [ ] Patch coverage: read the PR Codecov percentage after CI; report external access or pending-CI blockers explicitly.
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
