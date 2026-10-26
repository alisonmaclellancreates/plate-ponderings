/**
 * The sample screen gallery at /previews. One list drives the index cards, the
 * /previews/$screen route validation and each screen's head tags. Every screen
 * renders live components with sample data from src/lib/mock-data.ts only.
 */
export type PreviewGroup =
  | "Home and archive"
  | "Plate page"
  | "Spot a Plate"
  | "Add a story"
  | "Story menus"
  | "Account"
  | "Admin";

export interface PreviewEntry {
  slug: string;
  group: PreviewGroup;
  label: string;
  note: string;
}

export const PREVIEW_GROUPS: readonly PreviewGroup[] = [
  "Home and archive",
  "Plate page",
  "Spot a Plate",
  "Add a story",
  "Story menus",
  "Account",
  "Admin",
];

const e = (group: PreviewGroup, slug: string, label: string, note: string): PreviewEntry => ({
  slug,
  group,
  label,
  note,
});

export const PREVIEWS: readonly PreviewEntry[] = [
  e("Home and archive", "home-featured", "Homepage featured", "Plate of the Day, mystery pick, recently featured"),
  e("Home and archive", "home-fallback", "Plate of the Day, fallback", "A pick that already has stories"),
  e("Home and archive", "explore", "The Roadside Archive", "Featured plates, newest first, with Load More"),
  e("Home and archive", "explore-error", "Archive, couldn't load", "Inline retry"),

  e("Plate page", "plate-pnw-lv", "Oregon PNW LV", "Two stories, largely agree"),
  e("Plate page", "plate-mystery", "Mystery", "Washington B7K2L9, no stories"),
  e("Plate page", "plate-interpreted", "Interpreted", "British Columbia LV2CODE, five stories, no owner"),
  e("Plate page", "plate-owner", "Owner weighed in", "California TEATIME with an owner claim"),
  e("Plate page", "plate-history", "Earlier summaries", "LV2CODE with earlier summaries open"),
  e("Plate page", "plate-pending", "Your story is pending", "LV2CODE with your story waiting for its check"),
  e("Plate page", "plate-catching-up", "Catching up", "A new story the summary hasn't caught up with"),
  e("Plate page", "plate-guess-hidden", "Guess waiting", "A mystery with a hidden guess"),
  e("Plate page", "plate-guess-revealed", "Guess revealed", "The guess after the first human story"),

  e("Spot a Plate", "spot-validation", "Missing details", "Inline errors"),
  e("Spot a Plate", "spot-demo", "Demo", "Form turned off for the sample account"),
  e("Spot a Plate", "spot-checking", "Checking", "Checking the collection"),
  e("Spot a Plate", "spot-exists", "Already here", "British Columbia LV2CODE"),
  e("Spot a Plate", "spot-new", "New mystery", "Washington B7K2L9"),
  e("Spot a Plate", "spot-pending", "Waiting in the wings", "Your plate is waiting for its check"),
  e("Spot a Plate", "spot-rejected", "Not added", "The automated check said no"),
  e("Spot a Plate", "spot-already-spotted", "Spotted already", "Someone else's plate is waiting"),
  e("Spot a Plate", "spot-paused", "Paused", "Too many tries"),
  e("Spot a Plate", "spot-error", "Something went wrong", "Check unavailable"),

  e("Add a story", "story-1", "Step 1, your story", "How do you know, meaning, more"),
  e("Add a story", "story-owner-exists", "Owner already here", "Calm note under It's my plate"),
  e("Add a story", "story-photo", "Step 2, photo", "Drop area and privacy note"),
  e("Add a story", "story-photo-adjust", "Adjust the box", "Real editor with a suggested box"),
  e("Add a story", "story-photo-no-box", "No box found", "Real editor, draw the box"),
  e("Add a story", "story-photo-ready", "Photo ready", "The processed, blurred photo"),
  e("Add a story", "story-photo-unreadable", "Unreadable photo", "Choose another or continue"),
  e("Add a story", "story-3", "Step 3, review", "Summary of answers with the photo"),
  e("Add a story", "story-done", "Submitted", "Story published"),
  e("Add a story", "story-checking", "Being checked", "Story pending"),
  e("Add a story", "story-rejected", "Not added", "Step 1 with your words kept"),
  e("Add a story", "story-paused", "Paused", "Too many tries, words kept"),
  e("Add a story", "story-error", "Something went wrong", "Words kept"),
  e("Add a story", "story-demo", "Demo", "Form turned off for the sample account"),

  e("Story menus", "story-menus", "Story menus", "Someone else's story and your own"),
  e("Story menus", "story-report", "Report dialog", "Reasons and an optional note"),
  e("Story menus", "story-delete", "Delete dialog", "Confirm deleting your story"),

  e("Account", "submissions", "Your Submissions", "One row for every status, some updated"),
  e("Account", "account-states", "Account states", "Handle checks, sign-in errors, AI status"),
  e("Account", "settings", "Settings", "Blocked people and delete account"),
  e("Account", "settings-delete-confirm", "Delete account, confirm", "The final check"),

  e("Admin", "admin", "Admin", "Reported stories and AI check status"),
  e("Admin", "admin-ai-paused", "Admin, AI checks paused", "Blocked status with Resume"),
];

/** Real pages worth checking alongside the samples; these show live data. */
export const LIVE_PAGES = [
  { to: "/", label: "Homepage" },
  { to: "/explore", label: "The Roadside Archive" },
  { to: "/about", label: "About" },
  { to: "/privacy", label: "Privacy" },
  { to: "/contact", label: "Contact" },
  { to: "/not-found", label: "Not found" },
  { to: "/sign-in", label: "Sign In" },
  { to: "/sign-up", label: "Create an Account" },
  { to: "/demo", label: "Try the Demo" },
] as const;

export function findPreview(slug: string): PreviewEntry | undefined {
  return PREVIEWS.find((p) => p.slug === slug);
}

const SITE = "What the Plate?";

/** Head tags for a gallery page: unique title, never indexed. */
export function previewHead(entry: PreviewEntry | undefined) {
  const title = entry ? `${entry.label} (sample) | ${SITE}` : `Sample unavailable | ${SITE}`;
  const description = entry
    ? `Sample screen: ${entry.group}, ${entry.label.toLowerCase()}. ${entry.note}.`
    : "This sample screen doesn't exist.";
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
