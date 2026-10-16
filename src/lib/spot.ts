export type SpotOutcome =
  | "validation"
  | "checking"
  | "exists"
  | "new"
  | "pending"
  | "rejected"
  | "already-spotted"
  | "error";

export const SPOT_OUTCOMES: Record<SpotOutcome, string> = {
  validation: "Missing details",
  checking: "Checking the collection",
  exists: "Plate already here",
  new: "New mystery",
  pending: "Waiting for its check",
  rejected: "Couldn't add this plate",
  "already-spotted": "Spotted already",
  error: "Something went wrong",
};

export interface SpotValues {
  jurisdiction?: string | undefined;
  text?: string | undefined;
}
export interface SpotErrors {
  jurisdiction?: string | undefined;
  text?: string | undefined;
}

export const JURISDICTION_ERROR = "Please select a state or province";
export const TEXT_EMPTY_ERROR = "Please enter the plate text";
export const TEXT_ERROR = "Plates can use letters, numbers, spaces, and dashes";
export const TEXT_LENGTH_ERROR = "Plates can be up to 8 characters, not counting spaces and dashes";

/** Letters, numbers, spaces and dashes; up to 8 characters once spaces and dashes are removed. */
export function validateSpot(values: SpotValues): SpotErrors {
  const errors: SpotErrors = {};
  if (!values.jurisdiction) errors.jurisdiction = JURISDICTION_ERROR;
  const raw = (values.text ?? "").trim();
  const compact = raw.replace(/[\s-]/g, "");
  if (!raw) errors.text = TEXT_EMPTY_ERROR;
  else if (!/^[A-Za-z0-9\s-]*$/.test(raw)) errors.text = TEXT_ERROR;
  else if (compact.length > 8) errors.text = TEXT_LENGTH_ERROR;
  else if (!compact) errors.text = TEXT_EMPTY_ERROR;
  return errors;
}
