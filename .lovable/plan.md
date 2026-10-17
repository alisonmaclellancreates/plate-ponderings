# Step 43c: full jurisdiction in one shared detail frame

## Scope and data flow

Keep the existing plate identity unchanged: full `jurisdiction` name and `text` flow from either the preview record or the real page DTO into one `PlateFrame`. No schema, server, moderation, analytics or state-transition changes.

Both detail pages will retain their current appearance and behaviour, with one addition: the full jurisdiction name below the plate, for every jurisdiction.

## Implementation

1. Create `src/components/site/PlateFrame.tsx` with the existing navy-bordered frame, existing hidden page heading and existing large `Plate`, preserving their current classes and sizing.
2. Add a normal body-text line beneath the artwork. Centre it, constrain it to the artwork width and allow natural word wrapping so long names cannot widen the frame. Render it for short names too. Use existing semantic colour and typography tokens.
3. Mark only the added jurisdiction line `aria-hidden="true"`. The existing Plate accessible name already contains the full jurisdiction, so the new visible line adds no duplicate announcement. Preserve the existing page heading and Plate accessibility unchanged.
4. Replace the duplicated frame markup in both `PlateDetail` and `RealPlateDetail` with `PlateFrame`.
5. Record the shared detail-frame ownership in `AGENTS.md` and update the Step 43c checklist.

**Unchanged:** `Plate.tsx`, cards, thumbnails, admin, spot outcomes, component previews, routes, persistent records and all other detail-page content. No new production preview routes or seed data.

## Tests

- Add `tests/components/site/PlateFrame.test.tsx` using the real Plate component. Cover Newfoundland and Labrador and Utah, complete untruncated jurisdiction text beneath the artwork, the Plate's full accessible name and exclusion of the added line from the accessibility tree.
- Extend both detail-page test suites to prove they render the shared frame for long and short names. Use isolated test fixtures without mutating shared preview records.
- Preserve existing heading, navigation, status and story tests. Check source for a single owner of the detail-frame markup.

## Browser verification

Check both preview and real detail paths at **1280px and 360px**, with **Newfoundland and Labrador and Utah**: eight page/viewport cases. Inspect screenshots and measured text wrapping, frame width and page overflow. Confirm the long name remains complete below the plate and the short-name line is always present. Inspect the accessibility tree to ensure the new line contributes no second jurisdiction announcement.

Utah already exists in preview data; Newfoundland and Labrador does not. Prefer existing published real records where available. For missing cases, use browser-test-only fixtures through the existing page paths, without inserting records or changing application data. Report fixture-based checks explicitly, never as live database verification; if an actual live case remains unavailable, identify it as unverified.

## Completion and reporting

- Run the focused frame/detail tests and `bun run test:coverage` for the full app suite and configured coverage gate.
- Run **`bun run lint`** before finishing; fix every error in files changed for this step and distinguish any unchanged warnings.
- Check the automatic build diagnostics after edits. Do not run manual builds or typechecks.
- Read the **current pull request's Codecov report** and require **100% patch coverage**. Local coverage is diagnostic only. If Alison has not opened the PR or CI has not completed, report that blocker instead of claiming 100%.
- Stay on the current branch. Let Lovable's managed commits record the changes and verify the recorded commit without manual Git mutations; Alison handles branches and pull requests.
- Report only commands and browser checks actually run, the current PR Codecov figure actually read, and any remaining verification blocker.