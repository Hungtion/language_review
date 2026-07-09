"use client";

import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RequireAuth({ children, strict }: { children: React.ReactNode; strict?: boolean }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (strict && !loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router, strict]);

  if (loading) {
    return <div className="text-gray-500 text-center py-12">로딩 중...</div>;
  }

  if (strict && !user) return null;

  return <>{children}</>;
}
