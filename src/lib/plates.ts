/** Plate identity helpers shared by the browser and the server. */

/** Uppercases the plate text and removes spaces and dashes. O and 0 stay distinct. */
export function normalizePlateText(text: string): string {
  return text.toUpperCase().replace(/[\s-]/g, "");
}

/** The normalized key: jurisdiction code, a pipe, then the normalized plate text. */
export function plateKey(jurisdictionCode: string, text: string): string {
  return `${jurisdictionCode}|${normalizePlateText(text)}`;
}
