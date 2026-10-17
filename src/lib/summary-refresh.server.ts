export type SummaryRefreshOutcome = "saved" | "skipped" | "failed";

/**
 * Writes the next summary version for one plate. Order matters: the AI pause
 * and the published-story check come before the claim, so a skipped run never
 * uses up the plate's one run per minute. Nothing is saved on failure.
 */
export async function requestSummaryRefresh(subjectId: string): Promise<SummaryRefreshOutcome> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { readAiBlock, persistAiBlock } = await import("./ai-block.server");
  const block = await readAiBlock(supabaseAdmin);
  if (!block || block.category) return "skipped";

  const { count, error: countError } = await supabaseAdmin
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", subjectId)
    .eq("status", "published");
  if (countError || !count) return "skipped";

  const claim = await supabaseAdmin.rpc("claim_summary_run", { _subject_id: subjectId });
  if (claim.error || !claim.data) return "skipped";

  const startedAt = new Date().toISOString();
  const { data: rows, error } = await supabaseAdmin
    .from("stories")
    .select("meaning,source,body")
    .eq("subject_id", subjectId)
    .eq("status", "published")
    .order("published_at", { ascending: true });
  if (error || !rows || rows.length === 0) return "failed";

  const { generateSummary, SOURCE_LABELS } = await import("./summary-generation.server");
  const result = await generateSummary(
    rows.map((r) => ({
      meaning: r.meaning,
      sourceLabel: SOURCE_LABELS[r.source] ?? r.source,
      text: r.body,
    })),
  );
  if (result.outcome === "failed") {
    if (result.block) await persistAiBlock(supabaseAdmin, result.block, result.runId);
    return "failed";
  }

  const { data: latest, error: latestError } = await supabaseAdmin
    .from("summaries")
    .select("version")
    .eq("subject_id", subjectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) return "failed";

  const inserted = await supabaseAdmin.from("summaries").insert({
    subject_id: subjectId,
    version: (latest?.version ?? 0) + 1,
    text: result.summary.text,
    disagreement_score: result.summary.disagreementScore,
    story_count: rows.length,
    started_at: startedAt,
    generated_at: new Date().toISOString(),
  });
  return inserted.error ? "failed" : "saved";
}
