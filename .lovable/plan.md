# Restore the preview gallery (sample screens, anyone with the link)

## Outcome
`/previews` comes back as an unlisted gallery of about 45 sample screens, built on today's live screens and fed only sample data. Visitors can open it with the link. It is not linked from the site, search engines are told not to index it, and nothing in it can read or change real data.

## Data shape
```text
src/lib/mock-data.ts     sample plates, stories, summaries, submissions, reports, blocked handles
  (tests/fixtures/plates.ts re-exports it, so the existing tests keep working unchanged)
public/mock/story-photo-placeholder.jpg   restored sample photo, separate from /brand
Gallery registry (one list) -> drives the index cards and route validation
  { group, slug, label, note }   groups: Home, Archive, Plate, Spot, Story, Account, Admin, Info
```
Sample records are composed per state and never mutate shared records (the existing rule).

## Screens
- **Already prop-driven, reused as is:** Plate of the Day, Recently Featured, Explore grid, Your Submissions, Settings, Delete confirm, Admin, handle field states, sign-in/sign-up forms, story menus and both dialogs, photo editor (suggested box, no box found, review), Spot a Plate form with validation errors.
- **Hook-bound today:** plate detail, the add-story flow and Spot a Plate outcomes read live queries and hold their step internally. I'll pull their rendering out into pure view components (`PlateDetailView`, `AddStoryStepView`, `SpotOutcomeView`). The live wrappers keep fetching and submitting exactly as now and render those views, and the gallery renders the same views with sample props and no-op callbacks. No preview branches go back into the live components.
- **Plate states:** pnw-lv, mystery, interpreted, owner, earlier summaries open, pending story, catching up, hidden guess, revealed guess.
- **Spot outcomes:** validation, checking, exists, new, pending, rejected, already spotted, paused, error.
- **Story steps:** 1, owner already here, photo, adjust, review photo, review and submit, submitted, being checked, rejected with words kept, paused, error, demo disabled.
- **Live links:** the index also links to the real pages (home, explore, about, privacy, contact, not found, sign-in, demo), labelled "Live".

## Routes
- `/previews`: the index.
- `/previews/$screen`: a single route, validated against the registry, that 404s on an unknown slug. Every screen gets a unique title, `robots: noindex`, og tags and `twitter:card`.
- `robots.txt`: add `Disallow: /previews`.
- The live `/plate/$state` route stays live-only. Sample plates live under `/previews/plate-*` slugs.

## Safety boundary
Gallery screens import only `mock-data` and the pure views. They never import server functions, so any button in them is inert by construction. A test asserts that the gallery module graph has no `*.functions` imports.

## Tests (for 100% Codecov patch)
- Registry: every slug renders, unknown slugs 404, and every head has noindex.
- Each extracted view: rendered by its live wrapper (existing tests unchanged) and by the gallery with sample props.
- Inertness: clicking primary actions in gallery screens calls no server function.
- Locally: `bunx vitest related --run` on changed files, plus `bun run lint`. No full suite, coverage, build, browser or AI.

## Out of scope
Database, migrations, AI, and nav links to the gallery. Project knowledge already describes loader-free sample previews, so no AGENTS.md edit is needed.
