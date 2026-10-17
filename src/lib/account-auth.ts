import { createContext, useContext } from "react";

export type Account = { handle: string; isDemo: boolean; isAdmin: boolean };
type AuthContext = {
  account: Account | null;
  loading: boolean;
  demoEnabled: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  completeSignIn: (kind: "signed_in" | "signed_up") => Promise<void>;
};

export const Auth = createContext<AuthContext | null>(null);

export function useAccountAuth() {
  return useContext(Auth);
}