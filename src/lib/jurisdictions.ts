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
