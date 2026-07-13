"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "@/components/Toast";
import { useLocale } from "@/lib/useLocale";

export default function EcAutoImport() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const ran = useRef(false);
  const isKo = locale === "ko";

  useEffect(() => {
    if (!user || ran.current) return;
    const enabled = localStorage.getItem("eng-channel") === "true";
    const saved = localStorage.getItem("ec-save-credentials") === "true";
    const ecLoginId = localStorage.getItem("ec-login-id");
    const ecPassword = localStorage.getItem("ec-password");

    if (!enabled || !saved || !ecLoginId || !ecPassword) return;
    ran.current = true;

    (async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data: existing } = await supabase
          .from("study_sessions")
          .select("study_date")
          .eq("user_id", user.id)
          .eq("language", "english");
        const existingDates = (existing || []).map((n: { study_date: string }) => n.study_date);

        const res = await fetch("/api/ec/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ecLoginId, ecPassword, userId: user.id, existingDates }),
        });
        const data = await res.json();
        if (res.ok) {
          if (data.imported > 0) {
            toast(isKo ? `잉글리쉬채널 피드백 ${data.imported}개를 가져왔습니다!` : `Imported ${data.imported} English Channel feedbacks!`, "success");
          }
        } else {
          toast(isKo ? "잉글리쉬채널 연동 실패: 아이디/비밀번호를 확인해주세요." : "English Channel sync failed. Please check your credentials.", "error");
        }
      } catch {
        toast(isKo ? "잉글리쉬채널 연동 중 오류가 발생했습니다." : "Error syncing English Channel.", "error");
      }
    })();
  }, [user]);

  return null;
}
