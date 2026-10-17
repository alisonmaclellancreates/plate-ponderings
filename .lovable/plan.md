# Step 45b: What the Plate?'s fictional guess

## Data shape and transitions

Each published plate has zero or one immutable AI guess, separate from human stories. Reveal is derived from the current published-human-story count, never stored.

```text
plate publishes -> return published outcome immediately
                   background: paused / saved guess exists -> skip
                   otherwise generate -> validate -> insert once
                   failed / unusable -> nothing saved

own-account recheck, existing 3-minute interval
    -> pending plates publish -> background guess generation
    -> own published plates missing guesses -> background gap fill

guess + 0 published human stories  -> existence only, teaser
guess + 1+ published human stories -> meaning and fictional story
count returns to 0                -> hide text again, retain saved guess
```

No page-view generation, manual reveal button, synthetic human story, guess regeneration, or changes to existing summaries. Pending/rejected stories never unlock the guess. Blocking contributors does not change this global reveal rule.

## Proposed database change, awaiting approval

One new table, no changes to existing tables or policies:

```sql
create table public.subject_guesses (
  subject_id uuid primary key references public.subjects(id) on delete cascade,
  meaning text not null check (char_length(meaning) between 1 and 80),
  story text not null check (char_length(btrim(story)) > 0),
  created_at timestamptz not null default now()
);
revoke all on public.subject_guesses from public, anon, authenticated;
grant select, insert, delete on public.subject_guesses to service_role;
alter table public.subject_guesses enable row level security;
-- No policies; no update grant.
```

Application writes use insert only. The primary key preserves the first saved guess in a race; an existing guess is never overwritten. Delete access supports cleanup and the plate's cascade deletion, not a new visitor action.

**Tradeoff:** no extra claim/queue table. Concurrent background runs can make duplicate AI calls, but only one result is saved. The existing recheck interval remains three minutes. Three-sentence validation and em-dash replacement happen before saving.

## Implementation

### Server behavior

- Add server-only generation and persistence helpers, plus a public plate-guess read function. Keep shared search/spot plate DTOs unchanged.
- Dispatch generation through existing `runAfterResponse` immediately after successful spot publication and pending-plate publication. Do not await it or let a guess failure change publication's outcome.
- Extend authenticated recheck to select only the caller's own published plates without guesses, under the existing demo refusal, shared AI pause and three-minute interval. Preserve the current meaning of its moderation count. Process gap filling in bounded/sequential background work, checking the shared pause before each call.
- Use the default gateway text model through streamed structured output, following existing server-only AI helpers without changing existing AI calls. The jurisdiction and plate text go in an escaped, clearly marked untrusted-data block with explicit instructions to ignore instructions inside it.
- Enforce the uploaded fictional voice and content restrictions: What the Plate? itself, kind/playful/family-friendly, letters and numbers only, no vehicle/person/history claims, “One playful possibility…” framing. Meaning at most 80 characters; fictional story at most three sentences. Replace em dashes before final validation and saving. A failed or unusable response saves nothing. `GUESS_FORCE_UNAVAILABLE` is server-only and off by default. Terminal gateway blocks reuse the shared pause; no immediate retry of failed calls.
- Public read verifies the plate is published and counts published human stories globally, not the viewer-filtered count. Return a discriminated result: absent, hidden existence, or revealed meaning/story. Before reveal, query/project existence only and never return text. Fail closed on read errors. Keep guess text out of page metadata.

### Plate page and analytics

- Add the exact teaser beneath Add Your Story inside the existing invitation panel, after a small teal divider: “We've got a guess waiting.” and “What the Plate? has imagined a fictional meaning for these letters and numbers. Add the first story to reveal it.” No second button, blurred text or lock graphic. With no guess, the invitation is unchanged.
- Add the compact revealed panel after The Story So Far when present and before the human story list, in the main reading column. Use the exact label “Fictional · AI-written”, Fraunces heading “What the Plate?'s guess”, bold Inter meaning, complete regular Inter story, and the uploaded explanatory line verbatim.
- Pale teal background and thin teal border use semantic tokens. No avatar, handle, date, source badge, hearts or menu. Preserve human owner-first ordering and story counts. At 360px, teaser stays below the invitation button and the revealed panel is full width with natural meaning wrapping.
- Register `ai_guess_revealed` with no properties. Capture once per plate per mounted page when a revealed panel enters view, never for hidden/absent guesses. Preserve both analytics filtering paths so text cannot be sent.
- Keep routing, plate artwork and summary input logic unchanged. Record the new structural boundaries in `AGENTS.md`.

## Tests and verification

- Mock AI in tests: publication resolves while guess generation remains pending; paused/failed/unusable calls save nothing; existing guesses skip AI; duplicate insertion preserves the first result; recheck only fills the caller's plates and respects demo/pause/interval rules.
- Assert concrete limits: 80-character meaning accepted, 81 refused; three sentences accepted, four refused; em dashes replaced. Assert the untrusted-data and fictional prompt restrictions.
- Prove hidden server responses contain no meaning/story; pending/rejected stories do not reveal; one published story reveals; returning to zero hides again without deleting the guess. Include fail-closed and blocked-author cases.
- Prove summary input contains only published human stories even with a saved subject guess. Test unchanged counts and human owner-first order, plus no-property analytics capture/filtering.
- Add rollback-only `tests/db/subject-guesses.sql`: uniqueness, meaning limit, closed browser access, RLS/no policies, service read/insert, update refusal and cascade deletion. Run it and every existing `tests/db` file through the privileged database tool, with before/after leftover checks.
- Run relevant tests, full suite with diagnostic coverage, `bun run lint`, and changed-file formatting checks. Fix errors in changed files. Local coverage is not the PR acceptance figure.
- Verify real publication, own-account gap fill, and reveal/hide readback with response-payload privacy; inspect teaser/revealed layouts at 1280px and 360px. Verify background completion under local workerd if available; otherwise use the published site only if this code is deployed. Report exactly which checks ran, not implied deployment.
- Work on the current branch with Lovable-managed commits; no manual Git mutations. Alison handles branches/PRs. Report the PR's Codecov patch figure after it exists; 100% is the acceptance target, never substitute local coverage.

Approval authorizes the table above and this implementation scope. No migration or app changes before approval.
