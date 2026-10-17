import type { supabaseAdmin } from "@/integrations/supabase/client.server";

type Admin = typeof supabaseAdmin;

export type AiBlock = { category: string | null; blockedAt: string | null };

/** Reads the shared AI check block. Null means the read itself failed. */
export async function readAiBlock(admin: Admin): Promise<AiBlock | null> {
  const { data, error } = await admin
    .from("app_settings")
    .select("ai_check_block_category,ai_check_blocked_at")
    .eq("id", true)
    .single();
  if (error || !data) return null;
  return {
    category: data.ai_check_block_category,
    blockedAt: data.ai_check_blocked_at,
  };
}

/** Persists a terminal block shared by every AI check. Throws on failure. */
export async function persistAiBlock(
  admin: Admin,
  category: string,
  runId: string | undefined,
): Promise<void> {
  const { error } = await admin
    .from("app_settings")
    .update({
      ai_check_block_category: category,
      ai_check_blocked_at: new Date().toISOString(),
      ai_check_run_id: runId ?? null,
    })
    .eq("id", true);
  if (error) throw new Error("Could not persist AI check access block");
}
