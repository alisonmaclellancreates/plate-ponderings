import type { Box } from "@/lib/photo-blur";
/** Sample data for the /previews gallery and tests. Never read by live pages. */

import type { HowIKnow, Moderation, PlateRecord, Story, Summary } from "@/lib/domain";
export type {
  Consensus,
  HowIKnow,
  Moderation,
  PlateRecord,
  PlateStatus,
  ReportedStory,
  Story,
  Submission,
  Summary,
} from "@/lib/domain";
export { BLOCKING_EXPLANATION, DELETE_ACCOUNT_WARNING } from "@/lib/domain";
import type { PlateStatus, ReportedStory, Submission } from "@/lib/domain";

export const CURRENT_USER = { handle: "Traveler4821", hasNotification: true };

const s = (
  id: string,
  handle: string,
  date: string,
  meaning: string,
  howIKnow: HowIKnow,
  hearts: number,
  longer?: string,
): Story => ({ id, handle, date, meaning, howIKnow, hearts, ...(longer ? { longer } : {}) });

/** Blurred placeholder photo with a clear plate area, used until real uploads exist. */
export const STORY_PHOTO_PLACEHOLDER = "/mock/story-photo-placeholder.jpg";
/** Where the clear plate sits in the placeholder photo. */
export const STORY_PHOTO_BOX: Box = { x: 0.37, y: 0.46, w: 0.25, h: 0.12 };

const withPhoto = (...args: Parameters<typeof s>): Story => ({
  ...s(...args),
  photo: STORY_PHOTO_PLACEHOLDER,
  photoBox: STORY_PHOTO_BOX,
});

export const PLATES: PlateRecord[] = [
  { slug: "wa-b7k2l9", jurisdiction: "Washington", text: "B7K2L9", stories: [], summaries: [] },
  {
    slug: "bc-lv2code",
    jurisdiction: "British Columbia",
    text: "LV2CODE",
    consensus: "mixed",
    stories: [
      s("bc1", "maplegirl", "2026-10-02", "Love to code, a developer's plate.", "guess", 14),
      withPhoto(
        "bc2",
        "northshore",
        "2026-10-03",
        "Level 2 code, a security clearance joke.",
        "guess",
        6,
        "Saw it parked outside a data centre in Burnaby. Felt like an inside joke.",
      ),

      s("bc3", "rivercat", "2026-10-05", "Live to code.", "knows_owner", 11),
      s(
        "bc4",
        "Traveler4821",
        "2026-10-07",
        "LV as in Las Vegas, code as in poker tells.",
        "guess",
        2,
      ),
      s(
        "bc5",
        "teadragon",
        "2026-10-09",
        "The driver said it's about their bootcamp.",
        "secondhand",
        9,
      ),
    ],
    summaries: [
      {
        date: "2026-10-12",
        consensus: "mixed",
        storyCount: 5,
        text: "Most stories tie this plate to coding: love or live to code, and one contributor says the driver told them it's about a coding bootcamp. Two see a joke instead: a security clearance pun or a Las Vegas poker reference.",
      },
      {
        date: "2026-10-08",
        consensus: "mixed",
        storyCount: 4,
        text: "Readers are split: half see love or live to code, half see a joke.",
      },
      {
        date: "2026-10-05",
        consensus: "differ",
        storyCount: 3,
        text: "Readings split between coding and a security clearance joke.",
      },
      {
        date: "2026-10-03",
        consensus: "mixed",
        storyCount: 2,
        text: "Early stories lean toward a programmer's plate, with one joke reading.",
      },
    ],
  },
  {
    slug: "ca-teatime",
    jurisdiction: "California",
    text: "TEATIME",
    consensus: "agree",
    stories: [
      s(
        "ca1",
        "teadragon",
        "2026-09-20",
        "A nod to a lifelong love of tea.",
        "owner",
        31,
        "My grandmother poured me my first cup when I was five. I've been hooked ever since.",
      ),
      s("ca2", "maplegirl", "2026-09-21", "A tea lover, obviously.", "guess", 5),
      s("ca3", "rivercat", "2026-09-22", "Someone who really loves tea.", "knows_owner", 8),
      withPhoto(
        "ca4",
        "northshore",
        "2026-09-24",
        "Asked at a light: they just love tea.",
        "secondhand",
        7,
      ),
      s("ca5", "Traveler4821", "2026-09-26", "Afternoon tea enthusiast.", "guess", 3),
      s("ca6", "maplegirl", "2026-09-28", "Spotted near a tea shop. Makes sense.", "guess", 4),
    ],
    summaries: [
      {
        date: "2026-09-29",
        consensus: "agree",
        storyCount: 6,
        text: "Most people think this plate is about tea, and a contributor who says it's their plate explains it's a nod to a lifelong love of tea.",
      },
    ],
  },
  {
    slug: "ut-canyons",
    jurisdiction: "Utah",
    text: "CANYONS",
    stories: [],
    summaries: [],
    plateOfTheDay: "2026-10-16",
  },
  ...(
    [
      ["me-lobster", "Maine", "LOBSTER", "2026-10-15", "Fresh catch every morning."],
      ["ns-coastal", "Nova Scotia", "COASTAL", "2026-10-14", "Lives right by the sea."],
      ["co-wander", "Colorado", "WANDER", "2026-10-13", "Not all who wander are lost."],
      ["or-pnwlv", "Oregon", "PNW LV", "2026-10-12", "Pacific Northwest love."],
    ] as const
  ).map(([slug, jurisdiction, text, day, meaning], i) => ({
    slug,
    jurisdiction,
    text,
    plateOfTheDay: day,
    consensus: "agree" as const,
    summaries: [],
    stories: [
      s(`${slug}-1`, "rivercat", day, meaning, "guess", 4 + i),
      s(`${slug}-2`, "northshore", day, meaning, "knows_owner", 2 + i),
    ],
    ...(slug === "co-wander" ? { featuredStoryCount: 2 } : {}),
  })),
  ...(
    [
      ["az-sundog", "Arizona", "SUNDOG", "2026-10-11", 0, 1, 0],
      ["vt-maple", "Vermont", "MAPLE", "2026-10-10", 0, 0, 0],
      ["on-trillium", "Ontario", "TRILLIUM", "2026-10-09", 3, 5, 0],
      ["mt-bigsky", "Montana", "BIGSKY", "2026-10-08", 0, 3, 0],
      ["nm-chile", "New Mexico", "CHILE", "2026-10-07", 2, 0, 2],
      ["ab-prairie", "Alberta", "PRAIRIE", "2026-10-06", 0, 1, 1],
      ["fl-gator", "Florida", "GATOR", "2026-10-05", 0, 4, 0],
      ["hi-aloha", "Hawaii", "ALOHA", "2026-10-04", 4, 6, 0],
      ["qc-poutine", "Quebec", "POUTINE", "2026-10-03", 0, 2, 0],
    ] as const
  ).map(([slug, jurisdiction, text, day, featured, published, unpublished]) => ({
    slug,
    jurisdiction,
    text,
    plateOfTheDay: day,
    summaries: [],
    ...(featured > 0 ? { featuredStoryCount: featured } : {}),
    stories: [
      ...Array.from({ length: published }, (_, i) =>
        s(
          `${slug}-${i + 1}`,
          i % 2 ? "northshore" : "rivercat",
          day,
          `A ${text} reading.`,
          "guess",
          i,
        ),
      ),
      ...Array.from({ length: unpublished }, (_, i) => ({
        ...s(`${slug}-u${i + 1}`, "maplegirl", day, `A ${text} reading.`, "guess", 0),
        moderation: (slug === "nm-chile" ? "rejected" : "pending") as Moderation,
      })),
    ],
  })),
];

/** Used only by the PNW LV plate detail preview; the shared record stays unchanged. */
export const PNW_LV_SUMMARY: Summary = {
  date: "2026-10-12",
  consensus: "agree",
  storyCount: 2,
  text: "Both stories read this plate as Pacific Northwest love.",
};

/** Published only in the catching-up preview; shared LV2CODE data remains unchanged. */
export const CATCHING_UP_STORY: Story = s(
  "bc6",
  "maplegirl",
  "2026-10-14",
  "Saw a laptop sticker in the back window: definitely a coder.",
  "guess",
  0,
);

export function plateStatus(plate: PlateRecord): PlateStatus {
  const stories = publishedStories(plate);
  if (stories.some((story) => story.howIKnow === "owner")) return "owner";
  return stories.length > 0 ? "interpreted" : "mystery";
}

export function publishedStories(plate: PlateRecord): Story[] {
  return plate.stories.filter((story) => (story.moderation ?? "published") === "published");
}

/** Single source of truth for featured progress, defined in featured.ts. */
export { featuredProgress } from "@/lib/featured";

export const TODAY = "2026-10-16";

/** Every featured plate, newest first. */
export type FeaturedPlate = PlateRecord & { plateOfTheDay: string };

export function featuredPlates(): FeaturedPlate[] {
  const hasFeaturedDay = (p: PlateRecord): p is FeaturedPlate =>
    typeof p.plateOfTheDay === "string";
  return PLATES.filter(hasFeaturedDay)
    .filter((p) => p.plateOfTheDay <= TODAY)
    .sort((a, b) => b.plateOfTheDay.localeCompare(a.plateOfTheDay));
}

export const SUBMISSIONS: Submission[] = [
  {
    id: "sub-pnwlv",
    jurisdiction: "Oregon",
    text: "PNW LV",
    kind: "plate",
    date: "2026-10-09",
    moderation: "published",
    explanation: "This plate is live with 2 stories.",
    plateState: "pnw-lv",
    action: "view",
    updated: true,
  },
  {
    id: "sub-teatime",
    jurisdiction: "California",
    text: "TEATIME",
    kind: "story",
    date: "2026-09-26",
    moderation: "published",
    explanation: "Your story is live and has 3 hearts.",
    plateState: "owner",
    action: "view",
  },
  {
    id: "sub-debuggr",
    jurisdiction: "Washington",
    text: "DEBUGGR",
    kind: "plate",
    date: "2026-10-06",
    moderation: "pending",
    explanation: "Waiting for its check. We'll let you know when it's ready.",
    action: null,
  },
  {
    id: "sub-canyons",
    jurisdiction: "Utah",
    text: "CANYONS",
    kind: "story",
    date: "2026-10-04",
    moderation: "rejected",
    explanation: "We couldn't add your story.",
    action: "dismiss",
    updated: true,
  },
  {
    id: "sub-trails",
    jurisdiction: "Colorado",
    text: "TRAILS",
    kind: "plate",
    date: "2026-10-02",
    moderation: "published",
    explanation: "This plate is live with 2 stories.",
    action: "view",
  },
];

/** Settings preview: handles the signed-in person has blocked. */
export const BLOCKED_HANDLES = ["maplegirl", "rivercat"];

/** Admin preview: reported stories awaiting review. */
export const REPORTED_STORIES: ReportedStory[] = [
  {
    id: "rep-1",
    jurisdiction: "British Columbia",
    text: "LV2CODE",
    handle: "maplegirl",
    meaning: "Love to code, a developer's plate.",
    reports: 3,
    reasons: ["Spam", "Something else"],
    status: "visible",
  },
  {
    id: "rep-2",
    jurisdiction: "California",
    text: "TEATIME",
    handle: "rivercat",
    meaning: "Someone who really loves tea.",
    reports: 1,
    reasons: ["Personal information"],
    status: "visible",
  },
  {
    id: "rep-3",
    jurisdiction: "Oregon",
    text: "PNW LV",
    handle: "northshore",
    meaning: "Pacific Northwest love.",
    reports: 2,
    reasons: ["Hurtful or harassing"],
    status: "hidden",
  },
];

export const PROFILE_SAMPLE_STORY: Story = {
  id: "profile-sample",
  handle: CURRENT_USER.handle,
  date: "2026-10-12",
  meaning: "Pacific Northwest love.",
  howIKnow: "guess",
  longer: "Saw this plate at a trailhead outside Bend.",
  hearts: 0,
};

/** Your Submissions sample preview: one row for every live row type, some marked Updated. */
export const SUBMISSIONS_SAMPLE: Submission[] = [
  {
    id: "sample-plate-published",
    jurisdiction: "Oregon",
    text: "PNW LV",
    kind: "plate",
    date: "2026-10-16",
    moderation: "published",
    explanation: "This plate is live with 2 stories.",
    plateState: "pnw-lv",
    action: "view",
    updated: true,
  },
  {
    id: "sample-story-published",
    jurisdiction: "California",
    text: "TEATIME",
    kind: "story",
    date: "2026-10-15",
    moderation: "published",
    explanation: "Your story is live and has 1 heart.",
    plateState: "owner",
    action: "view",
  },
  {
    id: "sample-plate-pending",
    jurisdiction: "Washington",
    text: "DEBUGGR",
    kind: "plate",
    date: "2026-10-14",
    moderation: "pending",
    explanation: "Waiting for its check. We'll let you know when it's ready.",
    action: null,
  },
  {
    id: "sample-story-pending",
    jurisdiction: "Oregon",
    text: "PNW LV",
    kind: "story",
    date: "2026-10-13",
    moderation: "pending",
    explanation: "Waiting for its check. We'll let you know when it's ready.",
    plateState: "pnw-lv",
    action: "view",
  },
  {
    id: "sample-plate-rejected",
    jurisdiction: "Nevada",
    text: "XQZZ 9",
    kind: "plate",
    date: "2026-10-12",
    moderation: "rejected",
    explanation: "We couldn't add your plate.",
    action: "dismiss",
    updated: true,
  },
  {
    id: "sample-story-rejected",
    jurisdiction: "Utah",
    text: "CANYONS",
    kind: "story",
    date: "2026-10-11",
    moderation: "rejected",
    explanation: "We couldn't add your story.",
    action: "dismiss",
    updated: true,
  },
];

export function asFeatured(p: PlateRecord) {
  return {
    slug: p.slug,
    jurisdiction: p.jurisdiction,
    text: p.text,
    day: p.plateOfTheDay ?? "",
    count: publishedStories(p).length,
    atPick: p.featuredStoryCount ?? 0,
    status: plateStatus(p),
  };
}
