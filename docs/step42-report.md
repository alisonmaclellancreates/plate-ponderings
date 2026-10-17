# Step 42 verification report

## Delivered

- Existing signup and signin forms now use real email/password accounts. Signup creates a unique four-digit Traveler handle without AI, excluding Traveler4821.
- Protected account and contribution-entry pages retain their URLs. Signed-out visitors return through `/auth` to `/sign-in`, carrying a validated same-site destination. `src/start.ts` is unchanged.
- Profile availability checks are debounced and never use AI. Saves recheck permissions, format, reserved names, uniqueness and the five-attempt rolling 15-minute limit before moderation.
- Profile and header read the real account handle. The header has session-driven signin/signout and verified admin affordances, with no notification dot.
- Handle checks alone persist explicit provider-access-denial or credit blocks. Transient failures preserve the current handle and allow a fresh save. No separate AI access table.
- Account and handle events use the existing single analytics registry with no event-specific properties.

## Checks actually run

- Full suite after patch-coverage follow-up: **533 tests passed across 114 files**.
- Coverage: **99.56% statements, 98.97% branches, 99.51% functions, 99.84% lines**. The existing 95% gate is unchanged and passes. All eight reported files have **100% statement, branch and line coverage locally**. Seven also have 100% function coverage; the run-id helper retains an unreachable placeholder resolver function (94.11% function coverage), unrelated to the patch line/branch gaps.
- Added behaviour tests for server input validators (the test harness now runs the actual validators), non-string refusal without privileged reads or moderation, terminal-block persistence without a run ID, stale availability responses, invalid drafts, signed-out profile submission, duplicate saves/auth submissions, omitted form fields, safe message-less password errors, multi-chunk streaming, failed auth-change refresh and stale signed-out reads, denial-code fallbacks, and the signed-out member-menu boundary. No production branches were removed or coverage rules weakened. The only production change exports the existing member-menu component for direct testing.
- PR readback through AlisonMacLellanCreates's GitHub API: **PR #86**, latest completed CI succeeded for commit `16ede3097410dda5cae51e92872e761f3465f4e1` before this follow-up; Codecov's report updated at **00:34:45 UTC on October 17, 2026** still reads **94.60154%**. CI has not yet run for these new tests. This is the old PR result, not confirmation of the new patch. Re-read Codecov after the follow-up sync and CI finish.
- Analytics test rerun after the test-only TypeScript correction: **11 tests passed**.
- Lint after pre-merge cleanup: **0 errors, 0 warnings in maintained files**; repository-wide **0 errors, 6 existing UI component-export warnings**. Context types and the consumer hook now live in `src/lib/account-auth.ts`; the provider exports only its component, stabilizes refresh, declares effect dependencies, and captures the generation ref for cleanup without disabling any rule.
- Automatic preview build: **build OK** after the final test correction.
- Step 41 summary visibility: **all seven assertions plus the signed-out case passed**, including deleted-before-ever-published inside the version window. The privileged database tool executed the same fixture/assertion sequence because both shell database connections denied access to summaries. Fixtures were removed.
- New rollback-only account database tests passed: generated-profile trigger, four-digit format, demo-number exclusion, unique generated handles, reserved/invalid rejection, case-insensitive collision refusal, denied browser profile writes, five accepted attempts, sixth refusal without recording, expiration after 15 minutes, demo refusal without recording, and closed attempt-table grants. Fixtures rolled back. These tests do not exercise simultaneous database transactions.
- Live desktop flow: signed-out `/profile` redirected to `/sign-in?returnTo=/profile`; signup returned to profile with Traveler2220; signout and signin returned to profile; ADMIN was rejected; a real streamed AI check approved SullyTest42; reload read the changed handle back. Signout replaced navigation and protected refresh returned to signin. No page errors were observed in these flow scripts.
- Live admin flow using an isolated verification account: test block showed `Blocked: credit_block`; **Resume handle checks** changed it to `Ready`; the verified admin menu showed Admin. Only this test block was cleared. Verification account, profile, roles and attempts were cleaned.
- Pre-merge desktop-account cleanup readback: matched the original desktop fixture email and confirmed **0 auth users**, **0 SullyTest42 profiles**, and **0 handle-save attempts in the entire attempt table**. The desktop verification account was already deleted; no deletion was necessary in this follow-up. Signed-out `/profile` still redirects to signin with its return path and no browser page errors.

## Final database state, read from the catalog

| Table                | anon | authenticated | service role                   |
| -------------------- | ---- | ------------- | ------------------------------ |
| profiles             | none | SELECT        | SELECT, INSERT, UPDATE, DELETE |
| user_roles           | none | SELECT        | SELECT, INSERT, UPDATE, DELETE |
| handle_save_attempts | none | none          | SELECT, INSERT, UPDATE, DELETE |
| app_settings         | none | none          | SELECT, INSERT, UPDATE, DELETE |

Relevant policies remain exactly `profiles: read own` (SELECT, authenticated, `auth.uid() = id`) and `user_roles: read own` (SELECT, authenticated, `auth.uid() = user_id`). There are no policies on app_settings or handle_save_attempts. Existing policies on other tables were not changed.

Both `profiles_handle_valid` and `handle_check_block_category_valid` are validated.

`create_generated_profile`, `on_account_created` and `consume_handle_save_attempt` are SECURITY DEFINER, with fixed `search_path=public, pg_temp`. Their execution ACL contains only the database owner and service role, not PUBLIC, anon or authenticated.

## Hosted auth settings

The configuration tools reported success enabling email/password, disabling email confirmation, disabling anonymous signup, enabling signup and enabling leaked-password protection. The live signup returning a session verifies immediate signup/signin behavior.

**Independent hosted-setting readback was unavailable.** Leaked-password protection and the hosted minimum password length are therefore not independently verified. In Lovable, inspect **More → Users → Auth settings → Email settings**, confirm **Password HIBP Check** is enabled and the password minimum is at least eight. The form enforces eight characters regardless. A live breached-password rejection was not attempted.

## Handle-block source and recovery

Source: **Lovable AI Gateway error semantics**, the platform integration guidance supplied to this project. No verified public URL was available, so these are direct quotations rather than an invented link:

> “Persist provider access-denial state on the server across page reloads and process restarts. Resume only after access is restored and the user starts a fresh request.”

> “402 — insufficient AI credits ... Persist a paused state checked by ALL automated/background/scheduled entry points. Resume only by explicit owner action ...”

This implementation has no background handle-check entry point. Only explicit provider access denial or a credit block persists handle-only state. Rate limits, timeouts and server failures do not. Every unavailable save preserves the old handle and shows the brief's handle-check-unavailable message.

**Inspect:** sign in as a verified admin and open `/admin` → **Handle check status**.

**Recover:** restore credits or provider access, then click **Resume handle checks** there. This action makes no AI call and clears only the handle block. Recovery is **not automatic** when credits/access return. The next user-initiated save calls AI. The exact operation is also documented in AGENTS.md and was verified in the live app.

## Verification limits and scope

- Account analytics filtering is verified in tests. Delivery of all five new events to PostHog was not independently inspected in this step.
- Concurrent uniqueness relies on the existing database unique index; its refusal path was tested. Simultaneous gateway-block and moderation requests were not load-tested.
- Mobile account flows were not rechecked in this step. Existing preview layouts were preserved.
- Plate/story/submission/settings data, contribution writes, demo launch and general admin-management actions remain previews or deferred work.
- No manual Git commit was made; Lovable manages repository state. Codecov is not a blocker and was not queried for this step.
