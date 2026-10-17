# Step 43: Look up a plate and Spot a Plate, wired to the real backend

Brief sections applied: "Identifying a subject", "What the checks enforce", "Copy". All wording comes from the brief; no new copy invented.

## Data shape and state transitions

A plate already exists as `subjects` (identity_a = jurisdiction code, identity_b = display text, normalized_key, status pending/published/rejected, created_by, published_at). This step adds no new subject fields. The two state transitions are:

- spot: validated input -> normalized key lookup -> AI subject check -> published (pass), nothing saved (fail), pending (check unavailable), nothing saved (DB error)
- recheck: own pending subjects -> published + subject_published notification, or rejected + subject_rejected notification, or left pending (still unavailable)

## Proposed database change (needs your approval before I apply it)

One migration, mirroring the handle-save pattern from step 42:

1. `subject_save_attempts` table (id, user_id, attempted_at) for the per-person add rate limit. Service-role only: no anon/authenticated grants, no policies, so the browser cannot read or write it. Adds a `consume_subject_save_attempt(_user_id)` SECURITY DEFINER function (five adds per 15 minutes, counted before the AI check).
2. `last_recheck_at timestamptz` nullable column on `profiles`, so the recheck throttle survives across stateless workers.

No changes to existing tables, policies, or grants. Browser INSERT on subjects stays denied; all writes go through server functions using the admin client after role checks through the caller's own session.

## Server functions (new `src/lib/plates.functions.ts`)

- `searchPlate({ jurisdiction, text })`: public, publishable client. Normalizes exactly per the brief (code + `|` + uppercased text, spaces and dashes removed, O and 0 distinct). Returns only the fields the page needs for a published subject; pending and rejected are never found.
- `spotPlate({ jurisdiction, text })`: `requireSupabaseAuth`. Refuses the demo role. Revalidates server-side, normalizes, looks up pending or published by key: published -> "exists" (links to it), someone else's pending -> "already-spotted" (reveals nothing), own pending -> "pending". Then consumes a rate-limit attempt, runs the subject check: pass -> insert published with published_at, "new"; fail -> save nothing, "rejected"; unavailable/timeout/unusable -> insert pending, "pending"; other DB error -> nothing saved, "error".
- `recheckPendingSubjects()`: `requireSupabaseAuth`, never for the demo role, at most once every few minutes per person via `last_recheck_at`. Rechecks the caller's own pending subjects and applies the transitions above.

## AI subject check (new `src/lib/plate-moderation.server.ts`)

Mirrors `moderateHandle`: Lovable AI Gateway, strict structured `{ approved: boolean }` output, no reasons returned. The jurisdiction and plate text go inside a clearly marked untrusted-data block with instructions to ignore any instructions they contain. Terminal provider denials and credit blocks persist to `app_settings` per the step 42 rule; transient failures stay "unavailable". A server-only env switch (`PLATE_CHECK_FORCE_UNAVAILABLE`) forces the unavailable path for testing: off by default, never set, and nothing in a request can turn it on. I will report it as off when done.

## Frontend wiring

- Homepage search card: inline validation with the brief's four messages before searching; on submit, match navigates straight to the plate page, no match shows the existing inline panel with both values kept and its button opening Spot a Plate prefilled. Values travel in the address bar (existing `jurisdiction`/`text` search params).
- New real route `/plate/$id` replacing the preview plate pages: published subjects only (pending/rejected are not found, even for the creator), showing frame, identity and status strip from real data; stories area stays on mock data until step 44. Reached from search it shows "Back to Search" returning to the homepage with both fields filled; otherwise the usual back link. The preview aliases keep working.
- Spot a Plate (`/_authenticated/spot/`): the existing gate sends signed-out visitors to sign in and back. Demo mode shows the form with submission disabled and the brief's demo message. Submission calls `spotPlate`; each outcome renders the existing outcome designs with real plate data, and "already-spotted" renders its panel under the form.
- Recheck trigger: one call site in the root account provider, once per page load, skipped when the last call was recent.

## From step 42b (folded in)

- Move the sign-in/sign-up error strings (wrong password, account couldn't be created, weak password, breached password) into named constants in `src/lib/account-rules.ts`; use them in Entry.tsx, `signupErrorMessage`, and the account previews. No wording changes.
- `/previews/account`: render the exported `SignInForm`/`SignUpForm` instead of the full pages, so the page has exactly one `<main>`.

## Analytics

Registry gains `subject_searched` ({ found, jurisdiction }) and `subject_spotted` ({ outcome: new | exists | pending | rejected | already_spotted | error }). Plate text is never sent; the never-send list is honored.

## Tests and verification

- Normalization (spacing, dashes, case, O vs 0), every spot outcome, the recheck transitions and throttle, demo refusal, rate limit, stale/own-handle-style edge cases where applicable. AI calls mocked.
- Analytics event tests including the never-send list.
- Rerun the step 41 database tests (`tests/db/*.sql`) after the migration and report the result.
- Focused lint on touched files, typecheck, build. Live check of search match/no-match and a real spot with the AI gateway, reported as actually observed.
- Commit to the current branch.
