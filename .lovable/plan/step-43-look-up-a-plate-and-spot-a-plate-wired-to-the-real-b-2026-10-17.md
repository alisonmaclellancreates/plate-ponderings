# Step 43: Look up a plate and Spot a Plate, wired to the real backend

Brief sections applied: "Identifying a subject", "What the checks enforce", "Copy". All wording comes from the brief; no new copy invented. Incorporates Alison's three plan changes: server-access reads, simultaneous-spot handling, and one shared AI pause.

## Data shape and state transitions

A plate already exists as `subjects` (identity_a = jurisdiction code, identity_b = display text, normalized_key, status pending/published/rejected, created_by, published_at). This step adds no new subject fields. The state transitions are:

- spot: validated input -> normalized key lookup -> AI subject check -> published (pass), nothing saved (fail), pending (check unavailable or AI checks blocked), nothing saved (DB error)
- recheck: own pending subjects -> published + subject_published notification, or rejected + subject_rejected notification, or left pending (still unavailable or blocked)

## Proposed database change (needs your approval before I apply it)

One migration:

1. `subject_save_attempts` table (id, user_id, attempted_at) for the per-person add rate limit. Service-role only: no anon/authenticated grants, no policies, so the browser cannot read or write it. Adds a `consume_subject_save_attempt(_user_id)` SECURITY DEFINER function (five adds per 15 minutes, counted before the AI check).
2. `last_recheck_at timestamptz` nullable column on `profiles`, so the recheck throttle survives across stateless workers.
3. Rename the `app_settings` block fields from `handle_check_block_category`, `handle_check_blocked_at`, `handle_check_run_id` to `ai_check_block_category`, `ai_check_blocked_at`, `ai_check_run_id`, keeping their current values (the active test block carries over).

No other changes to existing tables, policies, or grants. Browser INSERT on subjects stays denied; all writes go through server functions using the admin client after role checks through the caller's own session.

## Server functions (new `src/lib/plates.functions.ts`)

- `searchPlate({ jurisdiction, text })`: public server function, but reads with the server's access (admin client) inside the function, not the publishable client, because step 41 removed visitor read access to subjects on purpose. Normalizes exactly per the brief (code + `|` + uppercased text, spaces and dashes removed, O and 0 distinct). Returns only the fields the page needs for a published subject; pending and rejected are never found. Never returns created_by.
- `getPlate({ id })`: same server-access read for the `/plate/$id` loader; published only, minimal DTO, never created_by.
- `spotPlate({ jurisdiction, text })`: `requireSupabaseAuth`. Refuses the demo role. Revalidates server-side, normalizes, looks up pending or published by key: published -> "exists" (links to it), someone else's pending -> "already-spotted" (reveals nothing), own pending -> "pending". Then consumes a rate-limit attempt and runs the subject check: pass -> insert published with published_at, "new"; fail -> save nothing, "rejected"; unavailable/timeout/unusable or AI checks blocked -> insert pending without calling the AI, "pending"; other DB error -> nothing saved, "error".
  - Simultaneous spots: if the insert hits the unique rule on normalized_key, look the key up again and return what is now true: "exists" if published, "already-spotted" if someone else's is pending, "pending" if it's the caller's own. Never "error" for this case. Covered by a test.
- `recheckPendingSubjects()`: `requireSupabaseAuth`, never for the demo role, at most once every few minutes per person via `last_recheck_at`. Does nothing while AI checks are blocked. Otherwise rechecks the caller's own pending subjects and applies the transitions above.

## One shared AI pause

Credits and provider access are project-wide, so the pause is shared:

- The `app_settings` block fields become `ai_check_*` (migration above). Every AI check reads and writes the same block: the handle check, the subject check, and the pending recheck. Later steps reuse it.
- While blocked: a handle save keeps the old handle and shows its existing message; a spot is saved as pending without calling the AI; the recheck does nothing.
- The /admin panel keeps Rowan's approved layout with updated copy: section heading "AI check status", blocked heading "Blocked", blocked line "AI checks are paused. Nothing is published without a check. People keep their current handles.", "Paused since" with date and time, button "Resume AI checks", success after confirmed resume "AI checks resumed." The account preview's Blocked and Ready states are updated to match.
- AGENTS.md recovery instructions updated to the new names.
- Tests: a block set by any one check stops the others, and Resume AI checks clears the block for every check, not only the one that set it.

## AI subject check (new `src/lib/plate-moderation.server.ts`)

Mirrors `moderateHandle`: Lovable AI Gateway, strict structured `{ approved: boolean }` output, no reasons returned. The jurisdiction and plate text go inside a clearly marked untrusted-data block with instructions to ignore any instructions they contain. Terminal provider denials and credit blocks persist to the shared `ai_check_*` block; transient failures stay "unavailable". A server-only env switch (`PLATE_CHECK_FORCE_UNAVAILABLE`) forces the unavailable path for testing: off by default, never set, and nothing in a request can turn it on. I will report it as off when done.

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

- Normalization (spacing, dashes, case, O vs 0), every spot outcome, the simultaneous-spot conflict path, the recheck transitions and throttle, demo refusal, rate limit, and the shared-block behavior (a block set by any one check stops the others; Resume clears it for every check). AI calls mocked.
- The homepage look-up card focus test (pressing the button moves keyboard focus to the jurisdiction field and scrolls it into view) already exists from the static pages in `tests/components/site/Homepage.test.tsx`; I will confirm it still passes and report it as pre-existing.
- Analytics event tests including the never-send list.
- Rerun the step 41 database tests (`tests/db/*.sql`) after the migration and report the result.
- Focused lint on touched files, typecheck, build. Live check of search match/no-match and a real spot with the AI gateway, reported as actually observed.
- Commit to the current branch.
