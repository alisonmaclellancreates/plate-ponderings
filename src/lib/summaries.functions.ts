import { createServerFn } from "@tanstack/react-start";
import type { Consensus } from "./domain";
import { consensusFor, isCatchingUp } from "./summary";

export type PlateSummaryVersion = {
  version: number;
  text: string;
  consensus: Consensus;
  storyCount: number;
  generatedAt: string;
};

export type PlateSummaryResult = {
  current: PlateSummaryVersion | null;
  earlier: PlateSummaryVersion[];
  catchingUp: boolean;
};

/**
 * The Story So Far for a published plate, public and signed-out safe. It reads
 * with the admin client, which bypasses row level security, so every version
 * passes through the service-only visible-version RPC before it can be returned. When the
 * plate is catching up, a summary run starts after the response, never awaited.
 */
export const getPlateSummary = createServerFn({ method: "POST" })
  .inputValidator((data: { plateId: string }) => ({
    plateId: typeof data.plateId === "string" ? data.plateId : "",
  }))
  .handler(async ({ data }): Promise<PlateSummaryResult | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plate, error: plateError } = await supabaseAdmin
      .from("subjects")
      .select("id")
      .eq("id", data.plateId)
      .eq("status", "published")
      .maybeSingle();
    if (plateError || !plate) return null;

    const { data: versions, error } = await supabaseAdmin.rpc("get_visible_summary_versions", {
      _subject_id: plate.id,
    });
    if (error) return null;

    const visible = versions ?? [];

    const { data: published, error: storiesError } = await supabaseAdmin
      .from("stories")
      .select("published_at")
      .eq("subject_id", plate.id)
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (storiesError) return null;

    const newest = visible[0];
    const catchingUp = isCatchingUp({
      publishedCount: published?.length ?? 0,
      newestPublishedAt: published?.[0]?.published_at ?? null,
      newestVisible: newest
        ? { startedAt: newest.started_at, storyCount: newest.story_count }
        : null,
    });
    if (catchingUp) {
      const { runAfterResponse } = await import("./after-response.server");
      const { requestSummaryRefresh } = await import("./summary-refresh.server");
      runAfterResponse(requestSummaryRefresh(plate.id));
    }

    const toVersion = (v: (typeof visible)[number]): PlateSummaryVersion => ({
      version: v.version,
      text: v.text,
      consensus: consensusFor(v.disagreement_score),
      storyCount: v.story_count,
      generatedAt: v.generated_at,
    });
    return {
      current: newest ? toVersion(newest) : null,
      earlier: visible.slice(1).map(toVersion),
      catchingUp,
    };
  });
