import { createServerFn } from "@tanstack/react-start";
import type { FeaturedDisplay } from "./featured";

type FeaturedRow = {
  day: string;
  subject_id: string;
  stories_at_pick: number;
  jurisdiction: string;
  plate_text: string;
  story_count: number;
  has_owner_story: boolean;
};

function toDisplay(row: FeaturedRow): FeaturedDisplay {
  return {
    slug: row.subject_id,
    jurisdiction: row.jurisdiction,
    text: row.plate_text,
    day: row.day,
    count: row.story_count,
    atPick: row.stories_at_pick,
    status: row.has_owner_story ? "owner" : row.story_count > 0 ? "interpreted" : "mystery",
  };
}

export type FeaturedHome = {
  today: string;
  pick: FeaturedDisplay | null;
  recent: FeaturedDisplay[];
};
export type FeaturedPage = { today: string; plates: FeaturedDisplay[]; next: string | null };

export const getFeaturedHome = createServerFn({ method: "GET" }).handler(
  async (): Promise<FeaturedHome> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { effectiveToday } = await import("./effective-today.server");
    const today = await effectiveToday(supabaseAdmin);
    const { error: pickError } = await supabaseAdmin.rpc(
      "pick_featured_subject_for_today",
    );
    if (pickError) throw new Error("We couldn't load the featured plates right now.");
    const { data: rows, error } = await supabaseAdmin.rpc("get_featured_subject_days", {
      _limit: 5,
    });
    if (error) throw new Error("We couldn't load the featured plates right now.");
    const plates = (rows ?? []).map(toDisplay);
    const from = new Date(Date.parse(today) - 4 * 86_400_000).toISOString().slice(0, 10);
    return {
      today,
      pick: plates.find((p) => p.day === today) ?? null,
      recent: plates.filter((p) => p.day < today && p.day >= from),
    };
  },
);

export const getFeaturedArchive = createServerFn({ method: "POST" })
  .inputValidator((data: { before?: string | undefined }) => {
    const before = data.before;
    if (
      before !== undefined &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(before) ||
        !Number.isFinite(Date.parse(before)) ||
        new Date(before).toISOString().slice(0, 10) !== before)
    ) {
      throw new Error("Invalid feature date.");
    }
    return { before };
  })
  .handler(async ({ data }): Promise<FeaturedPage> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { effectiveToday } = await import("./effective-today.server");
    const today = await effectiveToday(supabaseAdmin);
    if (data.before === undefined) {
      // First page picks today's plate so /explore shows it even if the homepage
      // was not visited yet. A pick failure never blocks the archive read.
      await supabaseAdmin.rpc("pick_featured_subject_for_today");
    }
    const { data: rows, error } = await supabaseAdmin.rpc("get_featured_subject_days", {
      ...(data.before === undefined ? {} : { _before: data.before }),
      _limit: 13,
    });
    if (error) throw new Error("We couldn't load the featured plates right now.");
    const plates = (rows ?? []).slice(0, 12).map(toDisplay);
    return {
      today,
      plates,
      next: rows && rows.length > 12 ? (plates[11] as FeaturedDisplay).day : null,
    };
  });
