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
- Persistent data and sign-in live in Lovable Cloud (generated clients under `src/integrations/supabase`, schema only through migrations with RLS and GRANTs on every public table), so each step adds tables and policies instead of replacing the backend.
- CI runs independent checks and coverage jobs with frozen Bun installs; replay migrations only when `supabase/migrations/` exists, because Drizzle records are not replayable Cloud migrations.
- Keep generated routing and Cloud integration files out of lint and formatting, because Lovable rewrites them; keep non-generated source and tests covered by the existing rules.
- Static preview pages read only from `src/lib/mock-data.ts` and share the header, footer, plate and badge components in `src/components/site/`, so later steps swap the data source without touching page layouts.
- Compose state-specific preview stories without mutating shared plate records, so catching-up examples cannot change other previews.
- Brand colours live as tokens in `src/styles.css` (exact brand hex values, not oklch), because the brand pack specifies hex and approximations drift.
- Featured archive and homepage share `FeaturedPlateCard`; feature dates and counts at selection live on mock plate records, while current counts filter published stories, so progress cannot drift between views.
- `/plate/$state` accepts existing preview aliases and mock plate slugs through the same detail layout, preserving preview URLs while giving each archive card its own working destination.
