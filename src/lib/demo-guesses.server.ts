import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { readAiBlock } from "./ai-block.server";
import { requestPlateGuess } from "./plate-guesses.server";

export async function fillDemoGuesses(admin: SupabaseClient<Database>) {
  const settings = await admin.from("app_settings").select("demo_mode").eq("id", true).single();
  if (settings.error || !settings.data?.demo_mode) return { outcome: "error" as const, message: "Fill missing guesses is available only while demo mode is on." };
  const gaps = async () => {
    const rows = await admin.from("subjects").select("id,subject_guesses(subject_id)").eq("status", "published").order("created_at", { ascending: true });
    if (rows.error) throw new Error("Could not read missing guesses.");
    return (rows.data ?? []).filter((p) => p.subject_guesses === null);
  };
  try {
    for (const plate of (await gaps()).slice(0, 5)) {
      const block = await readAiBlock(admin);
      if (!block || block.category) break;
      await requestPlateGuess(plate.id);
    }
    return { outcome: "done" as const, message: `${(await gaps()).length} plates still need a guess.` };
  } catch {
    return { outcome: "error" as const, message: "We couldn't fill missing guesses. Please retry." };
  }
}