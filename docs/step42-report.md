# Step 42 verification report

## Delivered

- Existing signup and signin forms now use real email/password accounts. Signup creates a unique four-digit Traveler handle without AI, excluding Traveler4821.
- Protected account and contribution-entry pages retain their URLs. Signed-out visitors return through `/auth` to `/sign-in`, carrying a validated same-site destination. `src/start.ts` is unchanged.
- Profile availability checks are debounced and never use AI. Saves recheck permissions, format, reserved names, uniqueness and the five-attempt rolling 15-minute limit before moderation.
- Profile and header read the real account handle. The header has session-driven signin/signout and verified admin affordances, with no notification dot.
- Handle checks alone persist explicit provider-access-denial or credit blocks. Transient failures preserve the current handle and allow a fresh save. No separate AI access table.
- Account and handle events use the existing single analytics registry with no event-specific properties.

## Checks actually run

- Full suite: **507 tests passed across 114 files**.
- Coverage: **99.22% statements, 97.26% branches, 99.02% functions, 99.68% lines**. The existing 95% gate is unchanged and passes.
- Analytics test rerun after the test-only TypeScript correction: **11 tests passed**.
- Lint: **0 errors, 8 warnings**. Six are existing component-export warnings; two concern the new account provider's export and effect cleanup.
- Automatic preview build: **build OK** after the final test correction.
- Step 41 summary visibility: **all seven assertions plus the signed-out case passed**, including deleted-before-ever-published inside the version window. The privileged database tool executed the same fixture/assertion sequence because both shell database connections denied access to summaries. Fixtures were removed.
- New rollback-only account database tests passed: generated-profile trigger, four-digit format, demo-number exclusion, unique generated handles, reserved/invalid rejection, case-insensitive collision refusal, denied browser profile writes, five accepted attempts, sixth refusal without recording, expiration after 15 minutes, demo refusal without recording, and closed attempt-table grants. Fixtures rolled back. These tests do not exercise simultaneous database transactions.
- Live desktop flow: signed-out `/profile` redirected to `/sign-in?returnTo=/profile`; signup returned to profile with Traveler2220; signout and signin returned to profile; ADMIN was rejected; a real streamed AI check approved SullyTest42; reload read the changed handle back. Signout replaced navigation and protected refresh returned to signin. No page errors were observed in these flow scripts.
- Live admin flow using an isolated verification account: test block showed `Blocked: credit_block`; **Resume handle checks** changed it to `Ready`; the verified admin menu showed Admin. Only this test block was cleared. Verification account, profile, roles and attempts were cleaned.

## Final database state, read from the catalog

| Table | anon | authenticated | service role |
|---|---|---|---|
| profiles | none | SELECT | SELECT, INSERT, UPDATE, DELETE |
| user_roles | none | SELECT | SELECT, INSERT, UPDATE, DELETE |
| handle_save_attempts | none | none | SELECT, INSERT, UPDATE, DELETE |
| app_settings | none | none | SELECT, INSERT, UPDATE, DELETE |

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