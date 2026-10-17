# Rowan account review

## Delivered and verified

- At 360px, the handle input is 278px wide. Feedback is below it, with no horizontal overflow.
- `admin` and `ADMIN` produce the reserved-handle message; `rowan!` produces the invalid-character message. Server saves enforce the same classification. AI moderation retains the generic rejection.
- The mobile header shows a truncated handle. Its profile button accessible name retains the complete handle and “menu”. Desktop presentation is unchanged.
- Traveler3374 has the admin role. A real authenticated profile-menu → Admin flow reads Handle check status as Ready.
- Saving the existing Traveler3374 handle returned Changes saved. Reload read the same handle back. No deliberate change to Rowan's handle was made.
- Full suite: 536 tests across 114 files pass. Maintained lint: zero errors and warnings; repository: zero errors, six existing UI warnings. Automatic build: OK. No browser page errors in successful verification scripts.

## Reproduce live states

1. Sign in as Traveler3374. Reload if the session predates the admin grant.
2. Open Your Profile at 360px width. The current handle shows Available after the availability check.
3. Enter `admin` or `rowan!` to review their distinct feedback below the full-width field. No Save is needed to review these states.
4. Restore Traveler3374 and choose Save Changes to review success. Saves count toward the existing five-per-15-minute limit, even when rejected. Verification consumed this quota; wait for the rolling window to expire before further saves. Do not bypass the quota.
5. Open the profile menu, choose Admin, and inspect Handle check status. Ready is the current real state. No operational block was created or cleared for this review.

## Simulated review states

The PDF labels moderation rejection, sign-in failure, breached password, weak password, and account-creation failure as simulated. These screenshots render the real production components after browser-only response substitution. They prove visual wording/layout, not provider behaviour or hosted auth settings. No account was created by the error fixtures and no moderation-rejection fixture reached Cloud.

The existing tests provide reproducible response states:

- `tests/components/site/account-flows.test.tsx`: rejected/unavailable profile save; signin failure; breached password; absent signup session; signup network failure.
- `tests/lib/accounts.functions.test.ts`: deterministic refusals without moderation and generic moderation rejection preserving the existing handle.
- `tests/lib/account-rules.test.ts`: password failure classification and deterministic handle validation.

Run `bunx vitest run tests/components/site/account-flows.test.tsx tests/lib/accounts.functions.test.ts tests/lib/account-rules.test.ts`.

Hosted breached-password enforcement remains independently unverified; the screenshot must not be treated as evidence that the hosted setting rejected a real password. Blocked status and Resume handle checks were verified in Step 42, not retoggled on Rowan's account during this review.