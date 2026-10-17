/** Admin page copy and query key, kept apart from the component module for fast refresh. */
export const ADMIN_REPORTS_KEY = ["admin-reports"] as const;
export const ADMIN_ERROR = "Something went wrong. Please try again.";
export const RECHECK_PAUSED = "AI checks are paused. Resume them before rechecking.";

export function recheckNote(changed: number, remaining: number, stopped: boolean): string {
  const base = `${changed} changed. ${remaining} still waiting for a safety check.`;
  return stopped ? `${base} The check stopped early. Try again soon.` : base;
}
