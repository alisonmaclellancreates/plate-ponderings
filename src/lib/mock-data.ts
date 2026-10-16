/** Static preview data shared by every preview page. Replaced by Cloud data in a later step. */
export type PlateStatus = "mystery" | "interpreted" | "owner";
export type Consensus = "agree" | "mixed" | "differ";
export type HowIKnow = "owner" | "knows" | "asked" | "guess";
export type Moderation = "published" | "pending" | "rejected";

export interface Story {
  id: string;
  handle: string;
  date: string;
  meaning: string;
  howIKnow: HowIKnow;
  longer?: string;
  /** Optional photo URL shown small on the right of the story card. */
  photo?: string;
  hearts: number;
}

/** Newest first: summaries[0] is current, the rest are earlier versions. */
export interface Summary {
  date: string;
  consensus: Consensus;
  storyCount: number;
  text: string;
}

export interface PlateRecord {
  slug: string;
  jurisdiction: string;
  text: string;
  stories: Story[];
  consensus?: Consensus;
  summaries: Summary[];
  plateOfTheDay?: string;
}

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

const withPhoto = (...args: Parameters<typeof s>): Story => ({
  ...s(...args),
  photo: STORY_PHOTO_PLACEHOLDER,
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

      s("bc3", "rivercat", "2026-10-05", "Live to code.", "knows", 11),
      s(
        "bc4",
        "Traveler4821",
        "2026-10-07",
        "LV as in Las Vegas, code as in poker tells.",
        "guess",
        2,
      ),
      s("bc5", "teadragon", "2026-10-09", "The driver said it's about their bootcamp.", "asked", 9),
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
      s("ca3", "rivercat", "2026-09-22", "Someone who really loves tea.", "knows", 8),
      withPhoto(
        "ca4",
        "northshore",
        "2026-09-24",
        "Asked at a light: they just love tea.",
        "asked",
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
      s(`${slug}-2`, "northshore", day, meaning, "knows", 2 + i),
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
  if (plate.stories.some((story) => story.howIKnow === "owner")) return "owner";
  return plate.stories.length > 0 ? "interpreted" : "mystery";
}
