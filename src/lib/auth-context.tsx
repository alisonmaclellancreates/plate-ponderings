import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getAccount, getDemoSetting } from "./accounts.functions";
import { recheckPendingSubjects } from "./plates.functions";
import { identify, reset, setDemo, track } from "./analytics";
import { Auth, type Account } from "./account-auth";
import { checkSignedIn } from "./session-check";

// Client-side throttle for the pending-subject recheck; the server throttles too.
const RECHECK_GAP_MS = 3 * 60 * 1000;
let lastRecheckCall = 0;
export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const getOwnAccount = useServerFn(getAccount);
  const queryClient = useQueryClient();
  const router = useRouter();
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    const applyUser = async (user: Awaited<ReturnType<typeof checkSignedIn>>) => {
      if (current !== generation.current) return;
      if (!user) {
        setAccount(null);
        return;
      }
      const own = await getOwnAccount();
      if (current !== generation.current) return;
      setAccount(own);
      await setDemo(own.isDemo);
      await identify(user.id);
      if (!own.isDemo && Date.now() - lastRecheckCall >= RECHECK_GAP_MS) {
        lastRecheckCall = Date.now();
        void recheckPendingSubjects().catch(() => {});
      }
    };
    try {
      await applyUser(await checkSignedIn(applyUser));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [getOwnAccount]);
  useEffect(() => {
    const requests = generation;
    void refresh().catch(() => setLoading(false));
    void getDemoSetting()
      .then((s) => setDemoEnabled(s.demoEnabled))
      .catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      if (event === "SIGNED_OUT") {
        generation.current++;
        setAccount(null);
        setLoading(false);
        void reset();
      } else {
        queueMicrotask(() => {
          void refresh().catch(() => setLoading(false));
        });
        void queryClient.invalidateQueries();
      }
      void router.invalidate();
    });
    return () => {
      requests.current++;
      data.subscription.unsubscribe();
    };
    // The root owns this subscription; hydration and token refresh do not invalidate routes.
  }, [refresh, queryClient, router]);
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await track("signed_out", {});
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await reset();
    await router.navigate({ to: "/sign-in", search: { returnTo: "/" }, replace: true });
  }
  async function completeSignIn(kind: "signed_in" | "signed_up") {
    await refresh();
    await track(kind, {});
  }
  return (
    <Auth.Provider value={{ account, loading, demoEnabled, refresh, signOut, completeSignIn }}>
      {children}
    </Auth.Provider>
  );
}
