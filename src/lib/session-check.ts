import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const AUTH_TIMEOUT_MS = 1000;
/** The route guard may wait longer before treating a slow visitor as signed out. */
export const GUARD_TIMEOUT_MS = 8000;

/** Bound the wait, not the renewal, so healthy refreshes can still finish. */
export async function withAuthTimeout<T>(request: Promise<T>, timeoutMs: number = AUTH_TIMEOUT_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request.then((value) => ({ timedOut: false as const, value })),
      new Promise<{ timedOut: true }>((resolve) => {
        timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function checkedUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (error.status === 401 || error.status === 403) {
        await supabase.auth.signOut({ scope: "local" });
      }
      return null;
    }
    return data.user;
  } catch {
    // Network/storage failures are not proof that the saved session is invalid.
    return null;
  }
}

/** A timeout signs out the view only; a late result can restore its account. */
export async function checkSignedIn(
  onLateUser?: (user: User | null) => Promise<void>,
  timeoutMs: number = AUTH_TIMEOUT_MS,
) {
  const pending = checkedUser();
  const result = await withAuthTimeout(pending, timeoutMs);
  if (result.timedOut) {
    if (onLateUser) void pending.then(onLateUser).catch(() => {});
    return null;
  }
  return result.value;
}
