import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function effectiveToday(client: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await client.rpc("effective_today");
  if (error || !data) throw new Error("We couldn't load the featured plates right now.");
  return data;
}
