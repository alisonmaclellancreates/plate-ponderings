import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { buildSeed, SEED_HANDLES } from "./seed-data.server";
import { seedPhotos } from "./seed-photos.server";

type Client = SupabaseClient<Database>;
const PHOTO_AUTHORS: Record<string, string> = {
  RAINY7Q: "FogLightFan",
  EH2ZED: "MileMarker88",
  "2FOG4ME": "PlateWhisperer",
  MAPLE9X: "ChainUpCrew",
  YEEHA7Z: "BackseatDJ",
};
function checked<T extends { error: unknown }>(value: T): T {
  if (value.error) throw new Error("The current reset stage failed.");
  return value;
}

/** Cross-service stages are retryable, not a claimed cross-service transaction. */
export async function resetDemoSeed(
  admin: Client,
): Promise<{ outcome: "done" | "error"; message: string }> {
  let step = "preflight";
  const token = crypto.randomUUID();
  let claimed = false;
  const run = async (): Promise<{ outcome: "done" | "error"; message: string }> => {
    try {
      const settings = checked(
        await admin.from("app_settings").select("demo_mode,demo_today").eq("id", true).single(),
      ).data;
      if (!settings?.demo_mode)
        return {
          outcome: "error",
          message: "Reset seed data is available only while demo mode is on.",
        };
      const day = settings.demo_today;
      if (!day)
        return { outcome: "error", message: "Set the demo date before resetting seed data." };
      const email = process.env["DEMO_EMAIL"];
      const password = process.env["DEMO_PASSWORD"];
      if (!email || !password)
        return {
          outcome: "error",
          message: "Configure the sample account before resetting seed data.",
        };
      const photos = seedPhotos();
      const users = [];
      for (let page = 1; ; page++) {
        const batch = checked(await admin.auth.admin.listUsers({ page, perPage: 1000 })).data.users;
        users.push(...batch);
        if (batch.length < 1000) break;
      }
      const sample = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!sample)
        return {
          outcome: "error",
          message: "Configure the sample account before resetting seed data.",
        };
      const role = checked(
        await admin.rpc("has_role", { _user_id: sample.id, _role: "demo" }),
      ).data;
      const profile = checked(
        await admin.from("profiles").select("handle").eq("id", sample.id).single(),
      ).data;
      const admins =
        checked(await admin.from("user_roles").select("user_id").eq("role", "admin")).data ?? [];
      if (
        !role ||
        profile?.handle !== "Traveler4821" ||
        admins.some((a) => a.user_id === sample.id)
      )
        return {
          outcome: "error",
          message: "The sample account identity is not configured correctly.",
        };
      claimed = checked(await admin.rpc("claim_demo_reset", { _token: token })).data === true;
      if (!claimed)
        return { outcome: "error", message: "Another reset is running. Please retry later." };
      const renew = async () => {
        if (
          checked(await admin.rpc("renew_demo_reset", { _token: token, _day: day })).data !== true
        )
          throw new Error("Reset lease lost.");
      };
      const accounts: Record<string, string> = { Traveler4821: sample.id };
      step = "seed accounts";
      for (const handle of SEED_HANDLES.slice(1)) {
        await renew();
        const created = checked(
          await admin.auth.admin.createUser({
            email: `seed-${crypto.randomUUID()}@seed.whattheplate.invalid`,
            password: crypto.randomUUID() + crypto.randomUUID(),
            email_confirm: true,
          }),
        ).data.user;
        if (!created) throw new Error("Seed account was not created.");
        accounts[handle] = created.id;
      }
      // Validate the literal payload before clearing any existing content or media.
      const paths: Record<string, string> = {};
      for (const plate of Object.keys(photos)) {
        const author = accounts[PHOTO_AUTHORS[plate] ?? ""];
        if (!author) throw new Error("Seed photo author missing.");
        paths[plate] = `${author}/${crypto.randomUUID()}.jpg`;
      }
      const seed = buildSeed(day, accounts, paths);
      step = "photo clearing";
      const bucket = admin.storage.from("story-photos");
      // Listing repeatedly from zero is safe as each removed batch shrinks the folder.
      async function clearFolder(prefix: string): Promise<void> {
        for (;;) {
          await renew();
          const entries = checked(await bucket.list(prefix, { limit: 1000 })).data ?? [];
          if (!entries.length) return;
          const paths: string[] = [];
          for (const entry of entries) {
            const path = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.id) paths.push(path);
            else await clearFolder(path);
          }
          if (paths.length) checked(await bucket.remove(paths));
          // Empty virtual folders disappear from the next root listing.
        }
      }
      await clearFolder("");
      step = "photo upload";
      for (const [plate, bytes] of Object.entries(photos)) {
        await renew();
        // Every photo key received a path before the immutable seed payload was validated.
        const path = paths[plate] as string;
        checked(await bucket.upload(path, bytes, { contentType: "image/jpeg", upsert: false }));
      }
      step = "content replacement";
      await renew();
      checked(
        await admin.rpc("replace_demo_seed_content", {
          _token: token,
          _day: day,
          _seed: seed as unknown as Json,
        }),
      );
      step = "old account removal";
      const keep = new Set([...Object.values(accounts), ...admins.map((a) => a.user_id)]);
      for (const user of users) {
        if (keep.has(user.id)) continue;
        await renew();
        checked(await admin.auth.admin.deleteUser(user.id));
      }
      // Old seed handles must be released before assigning them on a repeated reset.
      step = "seed handles";
      for (const handle of SEED_HANDLES.slice(1)) {
        await renew();
        // The same handles were created above and validated by buildSeed before replacement.
        const id = accounts[handle] as string;
        checked(await admin.from("profiles").update({ handle }).eq("id", id));
      }
      step = "readback";
      for (const [table, expected] of [
        ["subjects", 16],
        ["stories", 17],
        ["summaries", 9],
        ["featured_days", 5],
        ["notifications", 2],
        ["reports", 1],
        ["hearts", seed.hearts.length],
        ["blocks", 0],
        ["subject_guesses", 0],
        ["summary_runs", 0],
      ] as const) {
        const result = checked(await admin.from(table).select("*", { count: "exact", head: true }));
        if (result.count !== expected) throw new Error("Seed count mismatch.");
      }
      for (const path of Object.values(paths)) checked(await bucket.download(path));
      return {
        outcome: "done",
        message: "Seed data reset: 16 plates, 17 stories, 9 summaries and 5 photos.",
      };
    } catch {
      return {
        outcome: "error",
        message: `Reset incomplete at ${step}. Retry Reset seed data to finish.`,
      };
    }
  };
  const result = await run();
  if (claimed) {
    try {
      checked(await admin.rpc("release_demo_reset", { _token: token }));
    } catch {
      return {
        outcome: "error",
        message:
          "Reset lease release failed. Wait for the lease to expire, then retry Reset seed data.",
      };
    }
  }
  return result;
}
