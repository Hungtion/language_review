"use client";

import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RequireAuth({ children, strict }: { children: React.ReactNode; strict?: boolean }) {
  const { user, loading, isAnonymous } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (strict && !loading && (!user || isAnonymous)) {
      router.replace("/login");
    }
  }, [user, loading, router, strict, isAnonymous]);

  if (loading) {
    return <div className="text-gray-500 text-center py-12">로딩 중...</div>;
  }

  if (strict && (!user || isAnonymous)) return null;

  return <>{children}</>;
}
