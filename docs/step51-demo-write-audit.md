# Step 51: demo write refusal audit

The sample account is identified by its verified `demo` role, not its handle or browser state. Server checks precede side effects. Database permissions below are cumulative through migration 0019; service-role seed insertion intentionally bypasses browser RLS. No refusal triggers were added.

| Action | Server refusal | Database refusal |
|---|---|---|
| Save handle | `saveHandle` checks demo before rate limit, moderation or update; returns brief demo message | Profiles have no browser UPDATE grant/policy; handle attempt RPC also refuses demo |
| Delete account | `deleteAccount` checks demo before content or Auth deletion | Content/profile/role browser deletes are unavailable; managed Auth deletion requires server privilege |
| Spot plate | `spotPlate` checks demo before attempt, AI or insertion | Subjects have no browser INSERT/UPDATE/DELETE; subject attempt RPC refuses demo |
| Submit story, including photo | `addStory` checks demo before photo handling/deletion, attempts, moderation or insert | Stories have no browser writes; story attempt RPC refuses demo |
| Detect photo | `detectPlateBox` checks demo before detection/attempt | Service-only photo attempt RPC refuses demo; browser cannot execute it |
| Upload photo | `uploadStoryPhoto` checks demo before Storage upload | No browser Storage write policies; only processed server uploads |
| Heart / unheart | `toggleHeart` checks demo before mutation | INSERT and DELETE RLS explicitly require non-demo caller |
| Report story | `reportStory` checks demo before insertion | INSERT RLS explicitly requires non-demo caller |
| Block / unblock | `blockAuthor` and `unblockUser` check demo before mutation | INSERT and DELETE RLS explicitly require non-demo caller |
| Delete own story | `deleteMyStory` checks demo before tombstone or photo deletion | Stories have no browser DELETE/UPDATE |
| Dismiss submission | `dismissSubmission` checks demo before removing history | Subjects/stories have no browser DELETE/UPDATE |
| Mark submissions read | `markSubmissionsRead` returns `{marked:false}` for demo before update | Notifications UPDATE RLS explicitly requires non-demo caller |
| Own pending plate recheck | `recheckPendingSubjects` checks demo and returns zero; account provider also skips call | Subjects have no browser UPDATE; attempt RPC refuses demo |
| Admin pending plate/story rechecks | Non-demo admin authorization; batch excludes all demo-role authors/spotters | No browser subject/story writes or recheck RPC execution |
| Hide/unhide stories and resume AI checks | Admin authorization rejects demo, including dual admin/demo role | No browser story/app-settings UPDATE |
| Reset seed data / fill missing guesses | Authenticated non-demo admin only; demo mode checked server-side; reset requires `RESET` | Reset/effective-day/lease RPCs and guesses are service-only; reset RPC rechecks mode/date/lease |

Interactive refusals show the brief's demo message and capture only `demo_write_refused` with an action identifier. Automatic read/recheck skips are silent and change nothing. Demo entry/exit capture `demo_started` and `demo_exited`; analytics retain the existing private-content exclusion rules.

## Verification boundary

Migration 0019 was applied unchanged after approval. The 11 existing database test files, including step 41 summary visibility, passed in rollback transactions. The added demo-reset SQL checks effective-day fallback/freezing, frozen no-pick behavior, reset preflight/lease/service-only access and demo attempt refusal; cleanup readback found no fixtures. No live seed reset or real AI calls were executed.

Mocked reset tests cover unrelated content removal, admin/sample preservation, exact seed counts, sequential retries, account handle uniqueness across two resets, five stored author-owned JPEGs with boxes, and lease-release errors. Auth and Storage replacement is staged, not a cross-service transaction. After a stage failure, retry the reset; a lease-release failure requires waiting for expiry before retrying.

## Seed media

All processed JPEGs are 1200 × 900, quality 0.85, using the step 49 downscale-by-24 then smoothed enlargement outside the sharp box. Pillow implements the build-time recipe; byte-identical browser output is not claimed. Originals remain only in `docs/seed-photos` and are never served or uploaded.

| JPEG | Bytes |
|---|---:|
| RAINY7Q | 67,091 |
| EH2ZED | 66,467 |
| 2FOG4ME | 70,849 |
| MAPLE9X | 65,593 |
| YEEHA7Z | 63,591 |
| **Total** | **333,591** |

## Alison's setup

Configure/identify the sample account as `Traveler4821` with the demo role, set `DEMO_EMAIL` and `DEMO_PASSWORD`, retain/create a non-demo admin account, set `demo_today` to `2026-10-17`, and enable `demo_mode`. Those settings and credentials were not changed by implementation. After recording the walkthrough, explicitly run Reset seed data, then Fill missing guesses until zero remain. Live checks and CI/PR coverage remain unverified here.
