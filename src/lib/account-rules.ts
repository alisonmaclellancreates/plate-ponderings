export const RESERVED_HANDLES = [
  "admin",
  "administrator",
  "owner",
  "demo",
  "moderator",
  "mod",
  "staff",
  "support",
  "whattheplate",
  "system",
  "null",
  "undefined",
];
export const HANDLE_UNAVAILABLE =
  "We couldn't check that handle right now. Your current handle is unchanged. Try again soon.";
export const HANDLE_REJECTED = "That handle couldn't be used. Your current handle is unchanged.";
export const RATE_LIMIT_MESSAGE =
  "You've done that a lot in a short time. Please wait a while and try again.";
export const DEMO_MESSAGE =
  "You're exploring the demo. You can look around, but adding plates and stories is turned off.";
export function handleFormatValid(handle: string) {
  return (
    /^[A-Za-z0-9_]{3,20}$/.test(handle) &&
    !RESERVED_HANDLES.includes(handle.toLowerCase()) &&
    handle.toLowerCase() !== "traveler4821"
  );
}
export function safeReturnPath(value: unknown): string {
  const unsafe = (path: string) =>
    /\\/.test(path) ||
    [...path].some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127);
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    unsafe(value)
  )
    return "/";
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || unsafe(decoded)) return "/";
    const url = new URL(value, "https://whattheplate.lovable.app");
    if (
      url.origin !== "https://whattheplate.lovable.app" ||
      /^\/(auth|sign-in|sign-up)(\/|$)/.test(url.pathname)
    )
      return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
export function signupErrorMessage(error: {
  code?: string | undefined;
  message?: string | undefined;
}) {
  if (
    error.code === "weak_password" ||
    (error.code === "validation_failed" && /password/i.test(error.message ?? ""))
  ) {
    return /breach|leak|pwned/i.test(error.message ?? "")
      ? "This password has appeared in a data breach. Please choose a different password."
      : "Please choose a stronger password with at least 8 characters.";
  }
  return "Your account couldn't be created. You can try again or sign in.";
}
export type HandleBlockCategory = "provider_access_denied" | "credit_block";
export function handleBlockCategory(status: number, type?: string): HandleBlockCategory | null {
  if (
    status === 402 ||
    (status === 403 &&
      ["credit_limit_reached", "ai_disabled", "workspace_ai_disabled"].includes(type ?? ""))
  )
    return "credit_block";
  if (
    status === 403 &&
    ["permission_error", "provider_access_denied", "provider_access_denial"].includes(type ?? "")
  )
    return "provider_access_denied";
  return null;
}
