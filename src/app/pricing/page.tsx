"use client";

import { useEffect, useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;

function PricingContent() {
  const { user, plan } = useAuth();
  const [subStatus, setSubStatus] = useState<string>("none");
  const [subEnd, setSubEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function loadSub() {
      const { data } = await supabase
        .from("users")
        .select("subscription_status, subscription_end")
        .eq("id", user!.id)
        .single();
      if (data) {
        setSubStatus(data.subscription_status || "none");
        setSubEnd(data.subscription_end);
      }
    }
    loadSub();
  }, [user]);

  async function handleSubscribe(method: "CARD" | "TOSSPAY") {
    if (!user) return;
    setLoading(true);

    try {
      const customerKey = `user_${user.id.replace(/-/g, "").slice(0, 20)}`;

      // Save customerKey to DB
      await supabase
        .from("users")
        .update({ customer_key: customerKey })
        .eq("id", user.id);

      const tossPayments = await loadTossPayments(CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey });

      await payment.requestBillingAuth({
        method,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: user.email || "",
      });
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("정말 구독을 해지하시겠습니까? 현재 결제 기간 만료일까지는 Pro 기능을 사용할 수 있습니다.")) return;
    setCancelling(true);

    try {
      const res = await fetch("/api/payment/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSubStatus("cancelled");
        alert("구독이 해지되었습니다. 만료일까지 Pro 기능을 이용할 수 있습니다.");
      } else {
        alert("해지 실패: " + (data.error || "알 수 없는 오류"));
      }
    } catch {
      alert("해지 중 오류가 발생했습니다.");
    }
    setCancelling(false);
  }

  const isActive = plan === "pro" && subStatus === "active";
  const isCancelled = plan === "pro" && subStatus === "cancelled";

  return (
    <div className="max-w-md mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Pro Plan</h1>
        <p className="text-gray-400 text-sm">AI 기능을 무제한으로 이용하세요</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold">
            1,000<span className="text-lg text-gray-400 font-normal">원/월</span>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-green-400">v</span>
            <span className="text-gray-300">Nuance Chat - AI 번역 + 뉘앙스 설명</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-400">v</span>
            <span className="text-gray-300">AI 자동 문장 추출</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-400">v</span>
            <span className="text-gray-300">복습 카드 AI 도우미</span>
          </div>
        </div>

        {/* Status */}
        {isActive && (
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 text-center">
            <p className="text-indigo-400 text-sm font-medium">Pro 구독 중</p>
            {subEnd && (
              <p className="text-gray-500 text-xs mt-1">
                다음 결제일: {new Date(subEnd).toLocaleDateString("ko-KR")}
              </p>
            )}
          </div>
        )}

        {isCancelled && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
            <p className="text-yellow-400 text-sm font-medium">해지 예정</p>
            {subEnd && (
              <p className="text-gray-500 text-xs mt-1">
                만료일: {new Date(subEnd).toLocaleDateString("ko-KR")}까지 이용 가능
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        {(plan === "free" || isCancelled) && (
          <button
            onClick={() => handleSubscribe("CARD")}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "처리 중..." : isCancelled ? "다시 구독하기" : "구독하기"}
          </button>
        )}

        {isActive && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-2 text-sm text-gray-500 hover:text-red-400 transition-colors"
          >
            {cancelling ? "처리 중..." : "구독 해지"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <RequireAuth>
      <PricingContent />
    </RequireAuth>
  );
}
