import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { effectiveToday } from "@/lib/effective-today.server";

it("uses the database's date rather than a browser clock", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: "2026-10-17", error: null });
  const client = { rpc } as unknown as SupabaseClient<Database>;
  expect(await effectiveToday(client)).toBe("2026-10-17");
  expect(rpc).toHaveBeenCalledWith("effective_today");
});
it.each([{ data: null, error: null }, { data: "2026-10-17", error: {} }])("refuses an unavailable effective date %j", async (result) => {
  const client = { rpc: vi.fn().mockResolvedValue(result) } as unknown as SupabaseClient<Database>;
  await expect(effectiveToday(client)).rejects.toThrow("couldn't load");
});