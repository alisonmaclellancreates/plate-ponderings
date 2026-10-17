import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const resetSeedData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { confirmation: string }) => ({ confirmation: input.confirmation }))
  .handler(async ({ data, context }) => {
    const adminRole = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const demoRole = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "demo",
    });
    if (adminRole.error || adminRole.data !== true || demoRole.error || demoRole.data !== false)
      return { outcome: "error" as const, message: "Admins only." };
    if (data.confirmation !== "RESET")
      return { outcome: "error" as const, message: "Type RESET to confirm." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resetDemoSeed } = await import("./demo-reset.server");
    return resetDemoSeed(supabaseAdmin);
  });

export const fillMissingGuesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const adminRole = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const demoRole = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "demo",
    });
    if (adminRole.error || adminRole.data !== true || demoRole.error || demoRole.data !== false)
      return { outcome: "error" as const, message: "Admins only." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fillDemoGuesses } = await import("./demo-guesses.server");
    return fillDemoGuesses(supabaseAdmin);
  });
