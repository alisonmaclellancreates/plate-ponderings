import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  handleFormatValid,
  HANDLE_REJECTED,
  HANDLE_UNAVAILABLE,
  RATE_LIMIT_MESSAGE,
  DEMO_MESSAGE,
} from "./account-rules";

export const getAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, roles] = await Promise.all([
      context.supabase.from("profiles").select("handle").eq("id", context.userId).single(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    if (profile.error || roles.error) throw new Error("Account could not be loaded");
    return {
      handle: profile.data.handle,
      isDemo: roles.data.some((r) => r.role === "demo"),
      isAdmin: roles.data.some((r) => r.role === "admin"),
    };
  });

export const getDemoSetting = createServerFn({ method: "GET" }).handler(async () => {
  // This service-only setting has no public Data API read path; project only its public flag.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("demo_mode")
    .eq("id", true)
    .single();
  return { demoEnabled: data?.demo_mode ?? false };
});

export const checkHandle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { handle: string }) => ({
    handle: typeof data.handle === "string" ? data.handle : "",
  }))
  .handler(async ({ data, context }) => {
    const { data: demo, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "demo",
    });
    if (roleError || demo || !handleFormatValid(data.handle)) return { available: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("handle", data.handle.replace(/_/g, "\\_"))
      .neq("id", context.userId);
    return { available: !result.error && result.data?.length === 0 };
  });

export const saveHandle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { handle: string }) => ({
    handle: typeof data.handle === "string" ? data.handle : "",
  }))
  .handler(async ({ data, context }) => {
    const { data: demo, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "demo",
    });
    if (roleError) return { outcome: "unavailable" as const, message: HANDLE_UNAVAILABLE };
    if (demo) return { outcome: "demo" as const, message: DEMO_MESSAGE };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const attempt = await supabaseAdmin.rpc("consume_handle_save_attempt", {
      _user_id: context.userId,
    });
    if (attempt.error) return { outcome: "unavailable" as const, message: HANDLE_UNAVAILABLE };
    if (!attempt.data) return { outcome: "rate_limited" as const, message: RATE_LIMIT_MESSAGE };
    if (!handleFormatValid(data.handle))
      return { outcome: "rejected" as const, message: HANDLE_REJECTED };
    const taken = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("handle", data.handle.replace(/_/g, "\\_"))
      .neq("id", context.userId);
    if (taken.error) return { outcome: "unavailable" as const, message: HANDLE_UNAVAILABLE };
    if (taken.data.length) return { outcome: "rejected" as const, message: HANDLE_REJECTED };
    const settings = await supabaseAdmin
      .from("app_settings")
      .select("handle_check_block_category")
      .eq("id", true)
      .single();
    if (settings.error || settings.data.handle_check_block_category)
      return { outcome: "unavailable" as const, message: HANDLE_UNAVAILABLE };
    const { moderateHandle } = await import("./handle-moderation.server");
    const result = await moderateHandle(data.handle);
    if (result.block) {
      const persisted = await supabaseAdmin
        .from("app_settings")
        .update({
          handle_check_block_category: result.block,
          handle_check_blocked_at: new Date().toISOString(),
          handle_check_run_id: result.runId ?? null,
        })
        .eq("id", true);
      if (persisted.error) throw new Error("Could not persist handle check access block");
    }
    if (result.outcome === "unavailable")
      return { outcome: "unavailable" as const, message: HANDLE_UNAVAILABLE };
    if (result.outcome === "rejected")
      return { outcome: "rejected" as const, message: HANDLE_REJECTED };
    const updated = await supabaseAdmin
      .from("profiles")
      .update({ handle: data.handle })
      .eq("id", context.userId)
      .select("handle")
      .single();
    if (updated.error) return { outcome: "rejected" as const, message: HANDLE_REJECTED };
    return { outcome: "changed" as const, message: "Changes saved.", handle: updated.data.handle };
  });

export const getHandleCheckStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (
      roles.error ||
      !roles.data.some((r) => r.role === "admin") ||
      roles.data.some((r) => r.role === "demo")
    )
      return { allowed: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("handle_check_block_category,handle_check_blocked_at")
      .eq("id", true)
      .single();
    if (error) throw new Error("Handle check status unavailable");
    return {
      allowed: true as const,
      category: data.handle_check_block_category,
      blockedAt: data.handle_check_blocked_at,
    };
  });
export const resumeHandleChecks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (
      roles.error ||
      !roles.data.some((r) => r.role === "admin") ||
      roles.data.some((r) => r.role === "demo")
    )
      return { resumed: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .update({
        handle_check_block_category: null,
        handle_check_blocked_at: null,
        handle_check_run_id: null,
      })
      .eq("id", true);
    return { resumed: !error };
  });
