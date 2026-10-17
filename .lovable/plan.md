# Step 52b: Accessibility review, fixes, and automated checks

Branch: current feature branch. No database changes. No feature, wording, or layout changes except where a fix requires it (each listed in the report).

## 1. Automated axe checks
- Add `vitest-axe` (axe-core matcher) as a dev dependency.
- New test file `tests/a11y/axe.test.tsx` rendering real components and asserting no violations for: homepage, real plate page with stories + summary history + revealed guess, mystery plate with teaser, the three story form steps, sign in, sign up, sign-in prompt, Spot a Plate and its outcomes, Your Submissions, Settings, /admin, every dialog (report, delete, photo zoom, alert-dialog where used), and the PhotoEditor with a suggested box.
- Dialogs: run axe against `document.body`, not the render container, because Radix portals dialog content out of the container.
- Keep axe's region rule on in full-page tests. If disabled for a component tested alone, do it per test with a comment saying why.
- Colour-contrast rule disabled in axe (jsdom cannot measure it); contrast covered by item 3.

## 2. Accessibility lint
- Add `eslint-plugin-jsx-a11y`, recommended ruleset, scoped to our components (src/components/site, src/routes, src/lib); generated src/components/ui primitives excluded unless a rule finds a real problem there.
- Fix all findings; lint must end at zero errors.

## 3. Colour contrast
- Script (`scripts/contrast-report.mjs` or a test helper) computing WCAG ratios for every text/background brand token pair: navy, coral, coral-cta, teal, gold, slate, muted-foreground, badge tones, placeholders, focus rings, disabled states, on cream/card/cream-warm backgrounds.
- Report a full ratio table (may exceed the 10-line report limit). Thresholds: 4.5:1 normal text, 3:1 large text and focus indicators.
- Any failing pair: finish and push everything else first; the colour change follows as its own commit once Alison approves (Rowan reviews).

## 4. Keyboard and focus
- Verify Tab order and visible focus styles (global :focus-visible already exists; extend where missing).
- Dialogs: focus trap, Esc close, focus return to opener (Radix provides this; verify with tests).
- Route change: focus moves to the new page's main heading (or skip-link target). Add a skip link to main content in the root layout.
- PhotoEditor: the draggable plate box gets an accessible name ("Plate area") and is movable and resizable from the keyboard (arrow keys to move, modifier+arrows to resize). If keyboard resizing would need a layout change, list it and ask Alison first.
- Tests for dialog focus behaviour and keyboard box control.

## 5. Screen reader semantics
- Audit: one h1 per page, heading order, landmarks (header/nav/main/footer), images described or decorative, icon-only buttons named, status changes announced (role="status"/aria-live), plate artwork announced once by accessible name.
- Fix findings; extend the axe/semantics tests.

## 6. Motion
- Respect prefers-reduced-motion for all animations/transitions (spot-drive already gated; headline-slide transition already gated; audit the rest).

## 7. Menus close on Escape and outside click
- MemberProfile menu, SiteHeader mobile menu, StoryActions story menu: close on Esc and outside click; focus returns to the opening button. Tests for both close paths per menu.

## 8. Report and Delete as real modal dialogs
- Move ReportDialog and DeleteStoryDialog from inline panels into modal dialogs built on the project's existing dialog primitives (Radix via src/components/ui/dialog.tsx): backdrop, aria-modal, focus trap, Esc close, focus returned to the menu button.
- Wording and layout inside them unchanged.

## 9. Unread dot in profile menu
- Repeat the header's unread dot beside "Your Submissions" in the profile menu, with the same hidden "New updates" text.

## 10. Progress component (issue #54)
- Check whether any page uses src/components/ui/progress.tsx (only FeaturedPlateCard matched a loose grep; verify real usage). If used, expose value to screen readers (role/aria-valuenow). If unused, leave issue #54 open and say so.

## Verification
- Local: `bunx vitest related` on every changed source file plus changed tests, and `bun run lint` (zero errors). No full suite, coverage, typecheck, or build locally; CI is authoritative.
- Tests for every new branch; target 100% patch coverage on first push.
- Report (max 10 lines): what changed, what ran, the PR Codecov figure, the contrast table, and any decisions for Alison.
