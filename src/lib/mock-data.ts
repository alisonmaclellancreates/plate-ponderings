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
  photo?: string;
  hearts: number;
}

export interface Summary {
  date: string;
  consensus: Consensus;
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

export const PLATES: PlateRecord[] = [
  { slug: "wa-b7k2l9", jurisdiction: "Washington", text: "B7K2L9", stories: [], summaries: [] },
  {
    slug: "bc-lv2code",
    jurisdiction: "British Columbia",
    text: "LV2CODE",
    consensus: "mixed",
    stories: [
      s("bc1", "maplegirl", "2026-10-02", "Love to code, a developer's plate.", "guess", 14),
      s(
        "bc2",
        "northshore",
        "2026-10-04",
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
        date: "2026-10-10",
        consensus: "mixed",
        text: "Most read it as love or live to code; a few see a joke.",
      },
      {
        date: "2026-10-06",
        consensus: "differ",
        text: "Readings split between coding and a clearance joke.",
      },
      {
        date: "2026-10-03",
        consensus: "agree",
        text: "Early stories agree it's a programmer's plate.",
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
        "I run a tea shop in Pasadena.",
        "owner",
        31,
        "Opened in 2019. Come say hi.",
      ),
      s("ca2", "maplegirl", "2026-09-21", "A tea lover, obviously.", "guess", 5),
      s("ca3", "rivercat", "2026-09-22", "The owner sells tea.", "knows", 8),
      s("ca4", "northshore", "2026-09-24", "Asked at a light: tea shop owner.", "asked", 7),
      s("ca5", "Traveler4821", "2026-09-26", "Afternoon tea enthusiast.", "guess", 3),
      s("ca6", "maplegirl", "2026-09-28", "Spotted near a tea shop. Makes sense.", "guess", 4),
    ],
    summaries: [
      {
        date: "2026-09-29",
        consensus: "agree",
        text: "Everyone agrees: the owner runs a tea shop.",
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

export function plateStatus(plate: PlateRecord): PlateStatus {
  if (plate.stories.some((story) => story.howIKnow === "owner")) return "owner";
  return plate.stories.length > 0 ? "interpreted" : "mystery";
}
