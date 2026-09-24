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
  isGeneralManager: boolean;
  /** True only for a real Owner, regardless of any "View as" override. */
  realIsOwner: boolean;
  viewAs: ViewAs | null;
  setViewAs: (v: ViewAs | null) => void;
  refreshEmployee: () => Promise<void>;
  signOut: () => Promise<void>;
};

/** Owner-only, display-only role simulation. The database still sees the real Owner. */
export type ViewAs = {
  tier: "manager" | "staff";
  canManageTeam: boolean;
  divisionScope: Employee["department_scope"];
};
const VIEW_AS_KEY = "biggers-view-as";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewAs, setViewAsState] = useState<ViewAs | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(VIEW_AS_KEY);
      if (raw) setViewAsState(JSON.parse(raw) as ViewAs);
    } catch {
      /* ignore */
    }
  }, []);
  const setViewAs = useCallback((v: ViewAs | null) => {
    setViewAsState(v);
    try {
      if (v) sessionStorage.setItem(VIEW_AS_KEY, JSON.stringify(v));
      else sessionStorage.removeItem(VIEW_AS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

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
    const realIsOwner = employee?.auth_tier === "owner";
    const activeViewAs = realIsOwner ? viewAs : null;
    const effective: Employee | null =
      employee && activeViewAs
        ? {
            ...employee,
            auth_tier: activeViewAs.tier,
            can_manage_team: activeViewAs.tier === "manager" && activeViewAs.canManageTeam,
            department_scope: activeViewAs.divisionScope,
          }
        : employee;
    const tier = effective?.auth_tier ?? null;
    return {
      session,
      employee: effective,
      realIsOwner,
      viewAs: activeViewAs,
      setViewAs,
      tier,
      loading,
      isManagerOrOwner: tier === "manager" || tier === "owner",
      isOwner: tier === "owner",
      isGeneralManager: tier === "manager" && effective?.can_manage_team === true,
      refreshEmployee: () => loadEmployee(session?.user?.id),
      signOut: async () => {
        setViewAs(null);
        await supabase.auth.signOut();
        setEmployee(null);
      },
    };
  }, [employee, loading, loadEmployee, session, viewAs, setViewAs]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
