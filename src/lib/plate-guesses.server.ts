import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { readAiBlock, persistAiBlock } from "./ai-block.server";
import { generateGuess } from "./guess-generation.server";

/** Insert only: a racing writer cannot replace the first saved guess. */
export async function requestPlateGuess(
  subjectId: string,
): Promise<"saved" | "skipped" | "failed"> {
  const block = await readAiBlock(supabaseAdmin);
  if (!block || block.category) return "skipped";
  const existing = await supabaseAdmin
    .from("subject_guesses")
    .select("subject_id")
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (existing.error) return "failed";
  if (existing.data) return "skipped";
  const plate = await supabaseAdmin
    .from("subjects")
    .select("identity_a,identity_b,jurisdictions!subjects_identity_a_fkey(name)")
    .eq("id", subjectId)
    .eq("status", "published")
    .maybeSingle();
  if (plate.error || !plate.data) return "skipped";
  const joined = plate.data.jurisdictions as unknown as { name: string } | null;
  const result = await generateGuess(joined?.name ?? plate.data.identity_a, plate.data.identity_b);
  if (result.outcome === "failed") {
    if (result.block) await persistAiBlock(supabaseAdmin, result.block, result.runId);
    return "failed";
  }
  const saved = await supabaseAdmin
    .from("subject_guesses")
    .insert({ subject_id: subjectId, ...result.guess });
  if (saved.error?.code === "23505") return "skipped";
  return saved.error ? "failed" : "saved";
}

/** Caller identity comes only from the authenticated recheck. Newly published IDs have their own dispatch. */
export async function fillPlateGuesses(userId: string, exclude: string[] = []): Promise<void> {
  const plates = await supabaseAdmin
    .from("subjects")
    .select("id,subject_guesses(subject_id)")
    .eq("created_by", userId)
    .eq("status", "published")
    .order("created_at", { ascending: true });
  if (plates.error || !plates.data) return;
  const gaps = plates.data
    .filter((p) => !exclude.includes(p.id) && p.subject_guesses === null)
    .slice(0, 3);
  for (const plate of gaps) {
    const block = await readAiBlock(supabaseAdmin);
    if (!block || block.category) break;
    await requestPlateGuess(plate.id);
  }
}
