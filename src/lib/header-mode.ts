/** member: signed in. signed-out: Sign in + Try the Demo. demo: sample traveler with Exit Demo. */
export type HeaderMode = "member" | "signed-out" | "demo";

/** Which header each preview path shows; every other path is the signed-in member header. */
export function headerModeFor(pathname: string): HeaderMode {
  if (["/sign-in-prompt", "/sign-in", "/sign-up", "/demo"].includes(pathname)) return "signed-out";
  if (pathname === "/demo-form") return "demo";
  return "member";
}
