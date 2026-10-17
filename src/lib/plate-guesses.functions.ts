import { createServerFn } from "@tanstack/react-start";

export type PlateGuess =
  | { status: "absent" }
  | { status: "hidden" }
  | { status: "revealed"; meaning: string; story: string };

/** Public projection: hidden text is never selected or serialized. */
export const getPlateGuess = createServerFn({ method: "GET" })
  .inputValidator((data: { plateId: string }) => ({
    plateId: typeof data.plateId === "string" ? data.plateId : "",
  }))
  .handler(async ({ data }): Promise<PlateGuess> => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.plateId))
      return { status: "absent" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const plate = await supabaseAdmin
      .from("subjects")
      .select("id")
      .eq("id", data.plateId)
      .eq("status", "published")
      .maybeSingle();
    if (plate.error || !plate.data) return { status: "absent" };
    const exists = await supabaseAdmin
      .from("subject_guesses")
      .select("subject_id")
      .eq("subject_id", data.plateId)
      .maybeSingle();
    if (exists.error || !exists.data) return { status: "absent" };
    const stories = await supabaseAdmin
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", data.plateId)
      .eq("status", "published");
    if (stories.error || !stories.count) return { status: "hidden" };
    const guess = await supabaseAdmin
      .from("subject_guesses")
      .select("meaning,story")
      .eq("subject_id", data.plateId)
      .maybeSingle();
    if (guess.error || !guess.data) return { status: "absent" };
    return { status: "revealed", meaning: guess.data.meaning, story: guess.data.story };
  });
