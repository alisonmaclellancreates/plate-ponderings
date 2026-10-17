import { useAccountAuth } from "@/lib/account-auth";
import { DemoBanner } from "./DemoBanner";

export function LiveDemoBanner() {
  const auth = useAccountAuth();
  if (!auth?.account?.isDemo || !auth.demoEnabled) return null;
  return <div className="mx-auto w-full max-w-6xl px-4 pt-4"><DemoBanner /></div>;
}