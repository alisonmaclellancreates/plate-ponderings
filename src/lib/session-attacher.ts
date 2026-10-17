import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { withAuthTimeout } from "./session-check";

// Project-owned: generated attachment waits indefinitely for session renewal.
export const attachSession = createMiddleware({ type: "function" }).client(async ({ next }) => {
  let token: string | undefined;
  try {
    const result = await withAuthTimeout(supabase.auth.getSession());
    if (!result.timedOut && !result.value.error) {
      token = result.value.data.session?.access_token;
    }
  } catch {
    // Public RPCs must still run when auth storage or renewal is unavailable.
  }
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});