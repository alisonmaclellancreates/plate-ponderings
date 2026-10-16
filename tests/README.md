# Tests

## Where tests live

- New tests go in `tests/`, mirroring `src/`: `tests/components/`, `tests/hooks/`, `tests/lib/`, `tests/integrations/supabase/`, `tests/routes/`.
- Wiring tests for `src/router.tsx`, `src/start.ts`, `src/server.ts` sit at the top of `tests/`.
- One test file per source file: `<source-name>.test.ts(x)`, e.g. `src/lib/utils.ts` -> `tests/lib/utils.test.ts`.
- Tests Lovable already wrote stay where they are (`src/test/app-routing.test.tsx`). The single setup file is `src/test/setup.ts`.

## Running

- `bun run test` runs everything once. `bun run test:watch` watches.
- `bun run test:coverage` runs with v8 coverage and enforces `coverage.thresholds` in `vitest.config.ts`.
- One file, coverage for one source file:
  `bunx vitest run tests/lib/utils.test.ts --coverage --coverage.include=src/lib/utils.ts --coverage.thresholds.statements=0 --coverage.thresholds.branches=0 --coverage.thresholds.functions=0 --coverage.thresholds.lines=0`

Environment is happy-dom, globals on, `testTimeout` 20s. Coverage counts every `src/**/*.{ts,tsx}` file, so untested files show as 0%.

## Strict TypeScript settings that bite test code

- `exactOptionalPropertyTypes`: pass an optional prop only when it has a value. Never pass `prop={undefined}`; spread conditionally.
- `noPropertyAccessFromIndexSignature`: use bracket access on index signatures (`process.env["X"]`, `record["key"]`).
- `noUncheckedIndexedAccess`: array and record lookups are `T | undefined`; narrow before use.
- `verbatimModuleSyntax` is off, `noUnusedLocals` is off.

## Ground rules

- Read the source first and test what it does today. Names in a step brief are expectations, not a contract.
- All tests are written new for this project. Nothing copied from other repos or templates.
- Never edit scaffold source to make it testable: no new exports, no ignore comments, no refactors. Unreachable branches stay uncovered and get reported.
- Assert behaviour. Each test must fail if the behaviour in its name breaks.
- Leave the environment as found: restore globals, env vars, timers, cookies, module mocks and spies in `afterEach` or `finally`. Silence only the exact console message expected. Simulate the server with `vi.stubGlobal("window", undefined)` and `vi.unstubAllGlobals()` in `finally`.
- Do not mock `@tanstack/react-router` globally; each file mocks it for itself when needed.
- Start every test file with an `import` or `export {}`.
- Leave `src/routeTree.gen.ts` and other generated files alone.
- Ratchet: after each step, raise the four `coverage.thresholds` to the new totals rounded down. Never lower one.

## Coverage map (after step 18)

Totals: statements 99.64, branches 98.94, functions 100, lines 99.81. Thresholds set to 99/98/100/99.
Baseline (step 10): statements 0.26, branches 0, functions 0, lines 0.27.

| File                                              | Stmts % | Branch % | Funcs % | Lines % | Step |
| ------------------------------------------------- | ------- | -------- | ------- | ------- | ---- |
| `src/components/ui/accordion.tsx`                 | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/alert-dialog.tsx`              | 100     | 100      | 100     | 100     | 13   |
| `src/components/ui/alert.tsx`                     | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/aspect-ratio.tsx`              | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/avatar.tsx`                    | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/badge.tsx`                     | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/breadcrumb.tsx`                | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/button.tsx`                    | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/calendar.tsx`                  | 100     | 100      | 100     | 100     | 14   |
| `src/components/ui/card.tsx`                      | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/carousel.tsx`                  | 98.18   | 87.87    | 100     | 98.18   | 14   |
| `src/components/ui/chart.tsx`                     | 98.46   | 99.01    | 100     | 98.43   | 14   |
| `src/components/ui/checkbox.tsx`                  | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/collapsible.tsx`               | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/command.tsx`                   | 100     | 100      | 100     | 100     | 13   |
| `src/components/ui/context-menu.tsx`              | 100     | 100      | 100     | 100     | 13   |
| `src/components/ui/dialog.tsx`                    | 100     | 100      | 100     | 100     | 13   |
| `src/components/ui/drawer.tsx`                    | 100     | 100      | 100     | 100     | 13   |
| `src/components/ui/dropdown-menu.tsx`             | 100     | 100      | 100     | 100     | 13   |
| `src/components/ui/form.tsx`                      | 100     | 100      | 100     | 100     | 14   |
| `src/components/ui/hover-card.tsx`                | 100     | 100      | 100     | 100     | 13   |
| `src/components/ui/input-otp.tsx`                 | 100     | 100      | 100     | 100     | 14   |
| `src/components/ui/input.tsx`                     | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/label.tsx`                     | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/menubar.tsx`                   | 100     | 100      | 100     | 100     | 13   |
| `src/components/ui/navigation-menu.tsx`           | 100     | 100      | 100     | 100     | 13   |
| `src/components/ui/pagination.tsx`                | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/popover.tsx`                   | 100     | 100      | 100     | 100     | 13   |
| `src/components/ui/progress.tsx`                  | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/radio-group.tsx`               | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/resizable.tsx`                 | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/scroll-area.tsx`               | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/select.tsx`                    | 100     | 100      | 100     | 100     | 13   |
| `src/components/ui/separator.tsx`                 | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/sheet.tsx`                     | 100     | 100      | 100     | 100     | 13   |
| `src/components/ui/sidebar.tsx`                   | 100     | 100      | 100     | 100     | 14   |
| `src/components/ui/skeleton.tsx`                  | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/slider.tsx`                    | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/sonner.tsx`                    | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/switch.tsx`                    | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/table.tsx`                     | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/tabs.tsx`                      | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/textarea.tsx`                  | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/toggle-group.tsx`              | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/toggle.tsx`                    | 100     | 100      | 100     | 100     | 12   |
| `src/components/ui/tooltip.tsx`                   | 100     | 100      | 100     | 100     | 13   |
| `src/hooks/use-mobile.tsx`                        | 100     | 100      | 100     | 100     | 14   |
| `src/integrations/supabase/auth-attacher.ts`      | 100     | 100      | 100     | 100     | 18   |
| `src/integrations/supabase/auth-middleware.ts`    | 100     | 100      | 100     | 100     | 18   |
| `src/integrations/supabase/client.server.ts`      | 100     | 100      | 100     | 100     | 18   |
| `src/integrations/supabase/client.ts`             | 100     | 100      | 100     | 100     | 18   |
| `src/integrations/supabase/cron-auth.ts`          | 100     | 100      | 100     | 100     | 18   |
| `src/integrations/supabase/previewAuthStorage.ts` | 97.43   | 98.63    | 100     | 100     | 18   |
| `src/lib/error-capture.ts`                        | 100     | 100      | 100     | 100     | 15   |
| `src/lib/error-page.ts`                           | 100     | 100      | 100     | 100     | 15   |
| `src/lib/lovable-error-reporting.ts`              | 100     | 100      | 100     | 100     | 15   |
| `src/lib/utils.ts`                                | 100     | 100      | 100     | 100     | 15   |
| `src/router.tsx`                                  | 100     | 100      | 100     | 100     | 16   |
| `src/routes/__root.tsx`                           | 100     | 100      | 100     | 100     | 17   |
| `src/routes/index.tsx`                            | 100     | 100      | 100     | 100     | 17   |
| `src/server.ts`                                   | 100     | 100      | 100     | 100     | 16   |
| `src/start.ts`                                    | 100     | 100      | 100     | 100     | 16   |

Branch 100% on a 0% file means the file has no branches, not that it is tested.

### Where the plan and the scaffold disagree

- No file is unmapped, but these are judgement calls:
  - `src/components/ui/command.tsx` (cmdk, wraps Dialog): placed in 13 as an overlay.
  - `src/components/ui/resizable.tsx`, `toggle-group.tsx`, `scroll-area.tsx`, `pagination.tsx`, `breadcrumb.tsx`: placed in 12; multi-part, not strictly single-control.
  - `src/integrations/supabase/client.server.ts` and `cron-auth.ts`: server-only, placed in 18 rather than 16.
  - `src/lib/error-capture.ts`, `error-page.ts`, `lovable-error-reporting.ts`: Lovable runtime error plumbing, placed in 15.
- Step 19 has nothing to cover yet: there is no `src/lib/email-templates/` or `src/routes/lovable/email/` in this project.
- `src/integrations/supabase/types.ts` is excluded as generated.
- Step 14 uncovered, unreachable through the public surface: `carousel.tsx` line 57 (`onSelect` guard for an undefined API; only ever called with an API), the `orientation ||` fallback (orientation always has a default), and `api?.off` optional chaining in the cleanup. `chart.tsx` line 301 (non-object payload guard; Recharts payload items are always objects).
- Step 16 notes: `start.ts` rethrows only objects carrying `statusCode`; a thrown `Response` or redirect without one is logged and becomes the 500 page (tests pin this). `server.ts` reaches every branch through `fetch`, including the no-default-export fallback.
- Step 17: both route files use Option B (mocked route factory), since it reaches the root error component and shell without full-document rendering and avoids the real router stalling on stylesheets. Follow this for new routes. The `?url` stylesheet import resolves to an empty string under Vitest, so the head test checks the link exists rather than its value.

### Step 18 notes

- `previewAuthStorage.ts` line 40 (`if (done) return;` in `finish`) is unreachable: the listener is removed and the timer cleared on the first finish, so nothing can call it twice.
- Never `await` a module's lazy client proxy (e.g. `return mod.supabase` from an async helper): awaiting reads `.then`, which builds the client. Return the module instead.
- `@supabase/supabase-js` is mocked with `vi.doMock` in every file; no test reaches a real backend.
