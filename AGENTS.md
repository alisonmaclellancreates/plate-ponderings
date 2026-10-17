<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Keep the home screen in `src/routes/index.tsx` and its visual rules in `src/styles.css`, preserving the TanStack routing foundation so future steps remain additive.
- Shared handle validation classifies deterministic input failures for both profile feedback and server refusals; AI rejection remains separate so visitors receive actionable input guidance without moderation reasons.
- Handle availability returns a three-state status (null for demo); live fields and inert previews share status rendering, and debounced results are tied to their draft so stale answers cannot leak into new input.
- Persistent data and sign-in live in Lovable Cloud (generated clients under `src/integrations/supabase`, schema only through migrations with RLS and GRANTs on every public table), so each step adds tables and policies instead of replacing the backend.
- CI runs independent checks and coverage jobs with frozen Bun installs; replay migrations only when `supabase/migrations/` exists, because Drizzle records are not replayable Cloud migrations.
- Keep generated routing and Cloud integration files out of lint and formatting, because Lovable rewrites them; keep non-generated source and tests covered by the existing rules.
- Static preview pages read only from `src/lib/mock-data.ts` and share the header, footer, plate and badge components in `src/components/site/`, so later steps swap the data source without touching page layouts.
- Compose state-specific preview stories without mutating shared plate records, so catching-up examples cannot change other previews.
- Brand colours live as tokens in `src/styles.css` (exact brand hex values, not oklch), because the brand pack specifies hex and approximations drift.
- Featured archive and homepage share `FeaturedPlateCard`; feature dates and counts at selection live on mock plate records, while current counts filter published stories, so progress cannot drift between views.
- `/plate/$state` accepts existing preview aliases and mock plate slugs through the same detail layout, preserving preview URLs while giving each archive card its own working destination.
- Only `src/lib/analytics.ts` imports the PostHog SDK; one runtime event registry derives event types and drives both capture and before_send filtering, preventing event definitions from drifting; root route effects capture query-free page paths after hydration. Registry-scoped instances support test-only events without adding production events.
- Map public PostHog connector values to `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` in Vite configuration, keeping application code independent of connector-specific names.
- AI moderation persists explicit provider-access-denial or credit blocks in the shared service-only `ai_check_*` settings, never transient rate limits/timeouts/server errors; this follows Lovable AI Gateway terminal-error requirements. The one block pauses every AI check: handles, plate checks and pending rechecks. While paused, handle saves keep the old handle, new plates are saved pending without an AI call, and the recheck does nothing. Admins inspect `/admin` → AI check status; after restoring credits or provider access, click **Resume AI checks** to clear the block manually. Restoration never clears it automatically, reset makes no AI call, and the next user-initiated check retries.
- Own-account operations live in authenticated server functions with server-only moderation; a root account provider owns auth lifecycle and cache teardown, keeping private identifiers out of page DTOs.
- Keep account context types and the consumer hook in `src/lib/account-auth.ts`, separate from the component-only provider; stabilize refresh and declare effect dependencies so auth lifecycle remains lint-safe without rule suppression.
- The member-profile menu is an independently testable component, including its signed-out refusal, so account boundaries can be verified without artificial context changes during a parent render.
- Protected routes use the client-only `_authenticated` gate and `/auth` adapter. Shared bounded `checkSignedIn` clears only definite rejections and restores late success; plate actions read account context, avoiding duplicate checks.
- Live and preview rate-limit outcomes share one renderer and the existing wait-message constant, so preview review cannot drift from the submitted flow.
- Live spot outcomes retain the submitted identity separately from route prefill, so pending feedback and return-to-search links describe the actual request even after the form remounts.
- PlateFrame owns the detail-only frame for static and real plate pages, so jurisdiction display stays identical without changing Plate artwork or other render locations.
- Register project-owned `attachSession`, never generated `attachSupabaseAuth`: bounded `getSession()` preserves normal renewal without blocking public RPCs. Server authorization remains unchanged; never read tokens directly from storage.
