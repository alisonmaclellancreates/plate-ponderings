import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getAccount, getDemoSetting } from "./accounts.functions";
import { identify, reset, setDemo, track } from "./analytics";

type Account = { handle: string; isDemo: boolean; isAdmin: boolean };
type AuthContext = {
  account: Account | null;
  loading: boolean;
  demoEnabled: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  completeSignIn: (kind: "signed_in" | "signed_up") => Promise<void>;
};
const Auth = createContext<AuthContext | null>(null);
export function useAccountAuth() {
  return useContext(Auth);
}
export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const getOwnAccount = useServerFn(getAccount);
  const queryClient = useQueryClient();
  const router = useRouter();
  const generation = useRef(0);
  async function refresh() {
    const current = ++generation.current;
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (current === generation.current) setAccount(null);
        return;
      }
      const own = await getOwnAccount();
      if (current !== generation.current) return;
      setAccount(own);
      await setDemo(own.isDemo);
      await identify(data.user.id);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
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
      generation.current++;
      data.subscription.unsubscribe();
    };
    // The root owns this subscription; hydration and token refresh do not invalidate routes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await track("signed_out", {});
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await reset();
    await router.navigate({ to: "/sign-in", replace: true });
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
