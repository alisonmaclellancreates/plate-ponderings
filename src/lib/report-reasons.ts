/** Report reasons shared by reporting and moderation. */
export const REPORT_REASON_OPTIONS = [
  { key: "personal_info", label: "Personal information" },
  { key: "harassment", label: "Hurtful or harassing" },
  { key: "spam", label: "Spam" },
  { key: "other", label: "Something else" },
] as const;
export const REPORT_REASONS = REPORT_REASON_OPTIONS.map((r) => r.label);
export type ReportReasonKey = (typeof REPORT_REASON_OPTIONS)[number]["key"];