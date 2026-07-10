"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  plan: "free" | "pro";
  credits: number;
  isAnonymous: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshCredits: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  plan: "free",
  credits: 0,
  isAnonymous: false,
  loading: true,
  signOut: async () => {},
  refreshCredits: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  async function fetchPlan(userId: string) {
    const { data } = await supabase
      .from("users")
      .select("plan")
      .eq("id", userId)
      .single();
    setPlan((data?.plan as "free" | "pro") || "free");
  }

  const fetchCredits = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    setCredits(data?.balance ?? 0);
  }, []);

  const refreshCredits = useCallback(async () => {
    if (user) await fetchCredits(user.id);
  }, [user, fetchCredits]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPlan(session.user.id);
        fetchCredits(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPlan(session.user.id);
        fetchCredits(session.user.id);
      } else {
        setPlan("free");
        setCredits(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  const isAnonymous = !!user?.is_anonymous;

  return (
    <AuthContext.Provider value={{ user, plan, credits, isAnonymous, loading, signOut, refreshCredits }}>
      {children}
    </AuthContext.Provider>
  );
}
