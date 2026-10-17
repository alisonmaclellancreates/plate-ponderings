import { createServerFn } from "@tanstack/react-start";

export const startDemo = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const settings = await supabaseAdmin.from("app_settings").select("demo_mode").eq("id", true).single();
  if (settings.error || !settings.data?.demo_mode) throw new Error("The demo is not available right now.");
  const email = process.env["DEMO_EMAIL"];
  const password = process.env["DEMO_PASSWORD"];
  if (!email || !password) throw new Error("The demo is not available right now.");
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) throw new Error("The demo is not available right now.");
  const id = signedIn.data.session.user.id;
  const [role, profile] = await Promise.all([
    supabaseAdmin.rpc("has_role", { _user_id: id, _role: "demo" }),
    supabaseAdmin.from("profiles").select("handle").eq("id", id).single(),
  ]);
  if (role.error || role.data !== true || profile.error || profile.data?.handle !== "Traveler4821")
    throw new Error("The demo is not available right now.");
  return { access_token: signedIn.data.session.access_token, refresh_token: signedIn.data.session.refresh_token };
});