import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/previews")({
  head: () => ({
    meta: [
      { title: "Previews | What the Plate?" },
      { name: "description", content: "Preview index for What the Plate? static screens." },
      { property: "og:title", content: "Previews | What the Plate?" },
      { property: "og:description", content: "Preview index for What the Plate? static screens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Previews,
});

/** Every static preview route. Add one entry per new preview page. */
const PREVIEWS = [
  { to: "/", label: "Homepage", note: "Hero, search, Plate of the Day, recently featured" },
  { to: "/explore", label: "The Roadside Archive", note: "14 featured plates, newest first" },
  {
    to: "/home-no-match",
    label: "Homepage, no match",
    note: "Search for Utah DRAGON finds nothing",
  },
  {
    to: "/home-fallback",
    label: "Homepage, fallback day",
    note: "No mystery available; WANDER is featured",
  },
  {
    to: "/preview/components",
    label: "Plate and badges",
    note: "Plate in three sizes, every badge",
  },
  { to: "/submissions", label: "Your Submissions", note: "Plates and stories, newest first" },
  { to: "/profile", label: "Your Profile", note: "Handle, help text and preview card" },
  { to: "/sign-in-prompt", label: "Sign in prompt", note: "Add Your Story for PNW LV, signed out" },
  { to: "/sign-in", label: "Sign In", note: "Email and password" },
  { to: "/sign-up", label: "Create an Account", note: "Email and password, no handle" },
  { to: "/demo", label: "Try the Demo", note: "What the demo shows" },
  { to: "/demo-form", label: "Demo, Add a story", note: "Step 1 read-only, profile menu open" },
  { to: "/settings", label: "Settings", note: "Blocked people and delete account" },
  { to: "/settings/delete-confirm", label: "Delete account, confirm", note: "Keep or delete" },
  { to: "/story-menu", label: "Story menus", note: "Report, block, delete and both dialogs" },
  { to: "/admin", label: "Admin", note: "Reported stories table" },
  { to: "/about", label: "About", note: "Why What the Plate? exists" },
  { to: "/privacy", label: "Privacy", note: "Storage, photos, AI, blocking, deleting" },
  { to: "/contact", label: "Contact", note: "Email link placeholder" },
  { to: "/not-found", label: "Not found", note: "Sasquatch and Back to Explore" },
  {
    to: "/previews/account",
    label: "Account states",
    note: "Handle field and save states, sign-in and sign-up errors, admin status",
  },
] as const;

/** Plate detail preview states, served by the /plate/$state route. */
const PLATE_PREVIEWS = [
  { state: "pnw-lv", label: "Plate detail, PNW LV", note: "Oregon PNW LV, 2 stories" },
  { state: "mystery", label: "Plate detail, mystery", note: "Washington B7K2L9, no stories" },
  {
    state: "interpreted",
    label: "Plate detail, interpreted",
    note: "British Columbia LV2CODE, 5 stories, no owner",
  },
  {
    state: "owner",
    label: "Plate detail, owner",
    note: "California TEATIME, 6 stories with an owner story",
  },
  {
    state: "interpreted-history",
    label: "Plate detail, earlier summaries",
    note: "LV2CODE with earlier summaries open",
  },
  {
    state: "pending-story",
    label: "Plate detail, pending story",
    note: "LV2CODE with your story waiting for its check",
  },
  {
    state: "catching-up",
    label: "Plate detail, catching up",
    note: "LV2CODE with the summary catching up",
  },
] as const;

/** Spot a Plate form and outcome previews. */
const SPOT_PREVIEWS = [
  { outcome: "validation", label: "Spot a Plate, missing details", note: "Inline errors" },
  { outcome: "checking", label: "Spot a Plate, checking", note: "Checking the collection" },
  { outcome: "exists", label: "Spot a Plate, already here", note: "British Columbia LV2CODE" },
  { outcome: "new", label: "Spot a Plate, new mystery", note: "Washington B7K2L9" },
  { outcome: "pending", label: "Spot a Plate, pending", note: "Waiting for its safety check" },
  { outcome: "rejected", label: "Spot a Plate, not added", note: "The automated check said no" },
  {
    outcome: "already-spotted",
    label: "Spot a Plate, spotted already",
    note: "Utah TRAILS is waiting for its check",
  },
  { outcome: "error", label: "Spot a Plate, error", note: "Something went wrong" },
] as const;

/** Add a story flow for Oregon PNW LV. */
const STORY_PREVIEWS = [
  { step: "1", label: "Add a story, step 1", note: "How do you know, meaning, more" },
  { step: "1-owner-exists", label: "Add a story, owner already here", note: "Calm note" },
  { step: "2", label: "Add a story, photo", note: "Drop area and privacy note" },
  { step: "2-adjust", label: "Add a story, adjust photo", note: "Plate box editor" },
  { step: "2-review", label: "Add a story, review photo", note: "Processed image" },
  { step: "3", label: "Add a story, review and submit", note: "Summary of answers" },
  { step: "done", label: "Add a story, submitted", note: "Outcome" },
  { step: "checking", label: "Add a story, being checked", note: "Outcome" },
  { step: "rejected", label: "Add a story, not added", note: "Step 1 with words kept" },
] as const;

function Previews() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl text-navy">Previews</h1>
      <p className="mt-2 text-lg">Static page previews. Mock data only.</p>
      <ul className="mt-8 space-y-3">
        {PREVIEWS.map((p) => (
          <li key={p.to}>
            <Link to={p.to} className="brand-card block p-4 hover:shadow-md">
              <span className="font-semibold text-navy">{p.label}</span>
              <span className="block text-sm text-muted-foreground">{p.note}</span>
            </Link>
          </li>
        ))}
        {PLATE_PREVIEWS.map((p) => (
          <li key={p.state}>
            <Link
              to="/plate/$state"
              params={{ state: p.state }}
              className="brand-card block p-4 hover:shadow-md"
            >
              <span className="font-semibold text-navy">{p.label}</span>
              <span className="block text-sm text-muted-foreground">{p.note}</span>
            </Link>
          </li>
        ))}
        <li>
          <Link to="/spot" className="brand-card block p-4 hover:shadow-md">
            <span className="font-semibold text-navy">Spot a Plate</span>
            <span className="block text-sm text-muted-foreground">The empty form</span>
          </Link>
        </li>
        {SPOT_PREVIEWS.map((p) => (
          <li key={p.outcome}>
            <Link
              to="/spot/$outcome"
              params={{ outcome: p.outcome }}
              className="brand-card block p-4 hover:shadow-md"
            >
              <span className="font-semibold text-navy">{p.label}</span>
              <span className="block text-sm text-muted-foreground">{p.note}</span>
            </Link>
          </li>
        ))}
        {STORY_PREVIEWS.map((p) => (
          <li key={p.step}>
            <Link
              to="/story/$step"
              params={{ step: p.step }}
              className="brand-card block p-4 hover:shadow-md"
            >
              <span className="font-semibold text-navy">{p.label}</span>
              <span className="block text-sm text-muted-foreground">{p.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
