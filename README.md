# What the Plate?

[![codecov](https://codecov.io/gh/alisonmaclellancreates/plate-ponderings/graph/badge.svg)](https://codecov.io/gh/alisonmaclellancreates/plate-ponderings)

**Every plate has a story.** What the Plate? is a home for the stories behind personalized license plates. Spot a plate from the US or Canada, share what you think it means and how you know, and see how everyone's stories compare.

- **Try it:** [whattheplate.lovable.app](https://whattheplate.lovable.app). "Try the demo" signs you in as a read-only sample traveler.
- **Walkthrough video:** [link]
- **Behind the build:** [link]

Built by Alison MacLellan for #SheBuilds Season 04, a 72-hour Lovable build event, October 15 to 17, 2026.

## Why it exists

People already share vanity plates in Facebook groups, but those groups collect the plates, not the stories. Guesses sit in comment threads that scroll away, with no way to look a plate up later and nothing to show whether the owner explained it or someone just guessed.

What the Plate? gives every plate a page where stories collect. Each story says what the plate means and how the writer knows: it's their plate, they know the owner, they asked the driver, or it's their best guess.

## Where AI is used

AI does the quiet work, and people always go first.

| Where | What it does | What it never does |
|---|---|---|
| Safety checks | Checks every new plate, story, photo and handle before it appears | Explain its decision to the visitor, or publish anything unchecked when it's unavailable |
| Photos | Finds the plate's box in a photo | See the stored photo unblurred: the browser blurs everything outside the box, and only that version is uploaded |
| The Story So Far | Summarizes a plate's stories, leading with where they disagree, with a consensus badge | Count hearts as evidence, quote a story, or treat an ownership claim as fact |
| The playful guess | Writes a fictional guess when a plate is spotted | Show it before a person has shared the first story |

If the AI is paused or unavailable, new submissions wait as pending and summaries show a "catching up" note.

## How it's built

| Layer | What |
|---|---|
| App | TanStack Start (React 19, TanStack Router and Query), Tailwind CSS 4 |
| Data and sign-in | Lovable Cloud (Supabase): Postgres, Auth and Storage |
| AI | The Lovable AI gateway, through the Vercel AI SDK, with structured output |
| Analytics | PostHog, with a never-send list: no story text, meanings, notes, handles or emails |
| Tests | Vitest, Testing Library and axe for the app; SQL checks for the database |
| CI | GitHub Actions: typecheck, lint, build and tests with coverage on every push; Codecov on every pull request |

### The security pattern

The browser never reads a table directly. Every public table has row-level security on and no browser read policies. Pages call server functions, which use a server-only client and return only the fields a page needs. Database functions are `security definer` with a fixed `search_path`, and only the server role can run them. Per-user rate limits use an advisory lock and the database clock. The demo account is refused on every write, both by the server and by the database.

## How it was built

This app was built one numbered step at a time, each one a GitHub issue with what to build, what not to touch, and what done looks like.

1. **Sully**, Lovable's agent, wrote a plan for the step.
2. **Lovelace** (Claude) reviewed the plan, then the pull request.
3. **Rowan** (ChatGPT) designed the brand, made the plate photos, and reviewed every screen at desktop and phone widths.
4. Each step was built on its own branch and merged into `dev` through a pull request, only when CI passed and Codecov showed every new line tested. Releases merged `dev` into `main`.

`AGENTS.md`, `roadmap.md` and `.lovable/plan/` keep the build's history: the rules the agent followed, what each step did, and the plans it wrote.

### By the numbers

| | |
|---|---|
| Pull requests merged | 51 |
| Commits | 1,073 |
| CI runs | 423 |
| Automated tests | 972, in 155 files |
| Database test files | 12, each run inside a rollback |
| Lines of app code | 16,301 |
| Lines of tests | 19,488 |
| Database migrations | 20 |

## What's where

```
src/
  routes/            pages (TanStack file routes)
  components/site/   the app's components
  lib/               server functions (*.functions.ts), server-only code (*.server.ts), shared helpers
  integrations/      the generated Lovable Cloud client
drizzle/migrations/  every database change, in order
tests/               app tests, mirroring src/
tests/db/            database checks, run inside a rollback
docs/
  brief.md           the app brief: vocabulary, rules, copy and AI rules
  seed.md            the demo content the admin reset loads
  seed-photos/       the original seed photos, all fictional
```

## Running it locally

You need [Bun](https://bun.sh).

```sh
bun install
bun run dev            # the app
bun run test           # the tests
bun run test:coverage  # with the coverage report
bun run typecheck
bun run lint
```

The app needs its own Lovable Cloud backend to do anything useful. The keys in `.env` are the publishable ones that ship to every browser; the server-only secrets live in Lovable Cloud and are never committed.

## Known limitations

- The site runs on a `.lovable.app` address, so there are no email flows, such as verification or password reset.
- Plates with symbols can't be entered.
- While demo mode is on, the date is frozen at Oct 17, 2026, so Plate of the Day stays the same for judging.

## Credits

Built by Alison MacLellan ([Sail Away Studios](https://sailawaystudios.net)), with Sully (Lovable), Lovelace (Claude) and Rowan (ChatGPT), and Sean testing on his phone. The idea came from a family member who wanted to know what the plates she sees mean.
