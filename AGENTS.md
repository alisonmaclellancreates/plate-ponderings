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

- Keep home in `src/routes/index.tsx` and styles in `src/styles.css` so routing remains additive.
- Shared handle validation classifies deterministic input failures for both profile feedback and server refusals; AI rejection remains separate so visitors receive actionable input guidance without moderation reasons.
- Handle availability returns a three-state status (null for demo); live fields and inert previews share status rendering, and debounced results are tied to their draft so stale answers cannot leak into new input.
- Persistent data and sign-in live in Lovable Cloud (generated clients under `src/integrations/supabase`, schema only through migrations with RLS and GRANTs on every public table), so each step adds tables and policies instead of replacing the backend.
- CI checks and coverage run independently with frozen Bun installs; replay only `supabase/migrations/` when present, because Drizzle records are not replayable Cloud migrations.
- Exclude generated routing and Cloud files from lint/formatting because Lovable rewrites them; retain existing rules for all non-generated source and tests.
- Static preview pages read only from `src/lib/mock-data.ts` and share the header, footer, plate and badge components in `src/components/site/`, so later steps swap the data source without touching page layouts.
- Compose state-specific preview stories without mutating shared plate records, so catching-up examples cannot change other previews.
- Brand colours live as tokens in `src/styles.css` (exact brand hex values, not oklch), because the brand pack specifies hex and approximations drift.
- Featured archive and homepage share `FeaturedPlateCard`; feature dates and counts at selection live on mock plate records, while current counts filter published stories, so progress cannot drift between views.
- `/plate/$state` accepts existing preview aliases and mock plate slugs through the same detail layout, preserving preview URLs while giving each archive card its own working destination.
- Only `src/lib/analytics.ts` imports the PostHog SDK; one runtime event registry derives event types and drives both capture and before_send filtering, preventing event definitions from drifting; root route effects capture query-free page paths after hydration. Registry-scoped instances support test-only events without adding production events.
- Map public PostHog connector values to `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` in Vite configuration, keeping application code independent of connector-specific names.
- AI checks persist only terminal provider-denial or credit blocks (never transient errors) in service-only `ai_check_*` settings, per Lovable AI Gateway rules. One block pauses every AI check (handles, plates, rechecks, summaries); paused handle saves keep the old handle, new plates save pending, rechecks do nothing. Only an admin clears it via `/admin` **Resume AI checks**; the next user-initiated check retries.
- Own-account operations live in authenticated server functions with server-only moderation; a root account provider owns auth lifecycle and cache teardown, keeping private identifiers out of page DTOs.
- Keep account context types and the consumer hook in `src/lib/account-auth.ts`, separate from the component-only provider; stabilize refresh and declare effect dependencies so auth lifecycle remains lint-safe without rule suppression.
- The member-profile menu is an independently testable component, including its signed-out refusal, so account boundaries can be verified without artificial context changes during a parent render.
- Protected routes use the client-only `_authenticated` gate and `/auth` adapter. Shared bounded `checkSignedIn` clears only definite rejections and restores late success; plate actions read account context, avoiding duplicate checks.
- Live and preview rate-limit outcomes share one renderer and the existing wait-message constant, so preview review cannot drift from the submitted flow.
- Live spot outcomes retain the submitted identity separately from route prefill, so pending feedback and return-to-search links describe the actual request even after the form remounts.
- PlateFrame owns the detail-only frame for static and real plate pages, so jurisdiction display stays identical without changing Plate artwork or other render locations.
- Register project-owned `attachSession`, never generated `attachSupabaseAuth`: bounded `getSession()` preserves normal renewal without blocking public RPCs. Server authorization remains unchanged; never read tokens directly from storage.
- Background AI uses `runAfterResponse` and request-scoped waitUntil; admin summaries filter via `is_summary_public`. Guesses use Astra's streamed structured low-reasoning Responses shape for stable behavior.
- Guesses use separate server-only insert-once storage and existence-only reads until published human stories unlock text, preventing story/summary contamination.
- Hidden guesses retain the invitation despite old summaries; revealed guesses follow summaries before human stories at every width, preserving reading order.
