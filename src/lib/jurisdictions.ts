/** Banner colour for a jurisdiction name on the plate. Tokens live in src/styles.css. */
export type PlateTone = "wa" | "ca" | "or" | "ut" | "bc" | "on" | "fallback";

const TONES: Record<string, PlateTone> = {
  washington: "wa",
  california: "ca",
  oregon: "or",
  utah: "ut",
  "british columbia": "bc",
  ontario: "on",
};

export function plateTone(jurisdiction: string): PlateTone {
  return TONES[jurisdiction.trim().toLowerCase()] ?? "fallback";
}

/**
 * Font size for plate text in container-width units so long text shrinks to fit.
 * Inter bold uppercase averages ~0.68em per glyph; the usable width is ~80% of the plate.
 */
export function plateFontSize(text: string): string {
  const length = Math.max(text.length, 1);
  const size = Math.min(22, 80 / (length * 0.68));
  return `${size.toFixed(2)}cqw`;
}

/** Every US state (plus DC) and Canadian province or territory, for the search dropdown. */
export const JURISDICTION_GROUPS: { label: string; names: string[] }[] = [
  {
    label: "United States",
    names: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
      "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois",
      "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
      "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana",
      "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
      "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
      "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
      "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
    ],
  },
  {
    label: "Canada",
    names: [
      "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
      "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island",
      "Quebec", "Saskatchewan", "Yukon",
    ],
  },
];
