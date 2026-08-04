import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Employee = Database["public"]["Tables"]["employees"]["Row"];
export type AuthTier = Database["public"]["Enums"]["auth_tier"];

type AuthContextValue = {
  session: Session | null;
  employee: Employee | null;
  tier: AuthTier | null;
  loading: boolean;
  isManagerOrOwner: boolean;
  isOwner: boolean;
  refreshEmployee: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEmployee = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setEmployee(null);
      return;
    }
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setEmployee(data ?? null);
  }, []);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      void loadEmployee(next?.user?.id).finally(() => setLoading(false));
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void loadEmployee(data.session?.user?.id).finally(() => setLoading(false));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadEmployee]);

  const value = useMemo<AuthContextValue>(() => {
    const tier = employee?.auth_tier ?? null;
    return {
      session,
      employee,
      tier,
      loading,
      isManagerOrOwner: tier === "manager" || tier === "owner",
      isOwner: tier === "owner",
      refreshEmployee: () => loadEmployee(session?.user?.id),
      signOut: async () => {
        await supabase.auth.signOut();
        setEmployee(null);
      },
    };
  }, [employee, loading, loadEmployee, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
