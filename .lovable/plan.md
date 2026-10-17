# Step 48c: menu exits and submissions return path

1. Close member profile and mobile navigation menus immediately on selection and on router location changes, including history navigation.
2. Add `from: "submissions"` only to submissions plate links. Accept only that exact marker in plate search validation and pass it to RealPlateDetail.
3. Preserve return-link priority: Search, Your Submissions, Explore, using the existing back-link styling.
4. Cover every menu item and navigation closure, accepted/rejected markers, and all back-link cases. Run related tests for all changed source and tests, then `bun run lint`.

No database, storage, server, wording or layout changes beyond the approved new link label. No local coverage, full suite, typecheck, build, browser or AI runs. Keep the existing branch; managed Git sync owns commits. Report only current PR Codecov, never local coverage.