"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  plan: "free" | "pro";
  isAnonymous: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  plan: "free",
  isAnonymous: false,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [loading, setLoading] = useState(true);

  async function fetchPlan(userId: string) {
    const { data } = await supabase
      .from("users")
      .select("plan")
      .eq("id", userId)
      .single();
    setPlan((data?.plan as "free" | "pro") || "free");
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchPlan(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchPlan(session.user.id);
      else setPlan("free");
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  const isAnonymous = !!user?.is_anonymous;

  return (
    <AuthContext.Provider value={{ user, plan, isAnonymous, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
