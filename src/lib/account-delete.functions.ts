import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEMO_MESSAGE } from "./account-rules";

export type DeleteAccountResult =
  | { outcome: "deleted" }
  | { outcome: "demo"; message: string }
  | { outcome: "error" };

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeleteAccountResult> => {
    const { data: demo, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "demo",
    });
    if (error) return { outcome: "error" };
    if (demo) return { outcome: "demo", message: DEMO_MESSAGE };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deleteAccountData, deletePosthogPerson } = await import("./account-delete.server");
    try {
      await deleteAccountData(supabaseAdmin, context.userId);
    } catch (failure) {
      console.error(failure);
      return { outcome: "error" };
    }
    await deletePosthogPerson(context.userId);
    return { outcome: "deleted" };
  });
