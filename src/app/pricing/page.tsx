"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useLocale } from "@/lib/useLocale";

function PricingContent() {
  const { user, plan } = useAuth();
  const router = useRouter();
  const { locale } = useLocale();
  const [showInterest, setShowInterest] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [sending, setSending] = useState(false);

  const isKo = locale === "ko";

  async function handleInterest() {
    if (!user) return;
    setSending(true);
    await supabase.from("premium_interest").upsert({
      user_id: user.id,
      email: user.email,
      type: "interest",
    }, { onConflict: "user_id,type" });
    setSending(false);
    setRegistered(true);
  }

  return (
    <div className="max-w-md mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">
          {isKo ? "프리미엄 구독" : "Premium Subscription"}
        </h1>
        <p className="text-text-muted text-sm">
          {isKo ? "AI 기능을 무제한으로 사용하세요" : "Unlimited access to AI features"}
        </p>
      </div>

      {plan === "pro" && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
          <p className="text-primary text-sm font-medium">
            {isKo ? "현재 프리미엄 이용 중입니다" : "You are on Premium"}
          </p>
        </div>
      )}

      <div className="bg-bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold">
            {isKo ? "출시 준비 중" : "Coming Soon"}
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-primary">✓</span>
            <span className="text-text-secondary">
              {isKo ? "Nuance Chat 무제한" : "Unlimited Nuance Chat"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-primary">✓</span>
            <span className="text-text-secondary">
              {isKo ? "AI 자동 분류 무제한" : "Unlimited AI auto-parsing"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-primary">✓</span>
            <span className="text-text-secondary">
              {isKo ? "복습 카드 AI 예문 무제한" : "Unlimited AI example sentences"}
            </span>
          </div>
        </div>

        {plan !== "pro" && (
          <div className="space-y-3 pt-2">
            <button
              onClick={() => setShowInterest(true)}
              className="w-full py-3 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium transition-colors"
            >
              {isKo ? "얼리버드 혜택 받기" : "Get Early Bird Benefits"}
            </button>
            <button
              onClick={() => router.back()}
              className="w-full py-3 bg-bg-input hover:bg-bg-hover text-text-secondary rounded-lg text-sm transition-colors"
            >
              {isKo ? "돌아가기" : "Go Back"}
            </button>
          </div>
        )}
      </div>

      {/* 관심 등록 팝업 */}
      {showInterest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setShowInterest(false)}>
          <div className="bg-bg-card border border-border-light rounded-2xl p-6 max-w-sm w-full text-center space-y-4 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowInterest(false)} className="absolute top-3 right-3 text-text-faint hover:text-text-secondary text-lg leading-none">✕</button>
            {registered ? (
              <>
                <div className="text-3xl">🎉</div>
                <p className="text-text text-[15px] leading-relaxed whitespace-pre-line">
                  {isKo
                    ? "등록 완료!\n정식 출시 시 할인 쿠폰을 보내드릴게요."
                    : "Registered!\nWe'll send you a discount coupon at launch."}
                </p>
                <button
                  onClick={() => setShowInterest(false)}
                  className="mt-2 px-8 py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-sm font-medium transition-colors"
                >
                  {isKo ? "확인" : "OK"}
                </button>
              </>
            ) : (
              <>
                <div className="text-3xl">✨</div>
                <h3 className="text-text font-bold text-lg">
                  {isKo ? "오픈 베타 준비 중!" : "Open Beta Coming Soon!"}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed whitespace-pre-line">
                  {isKo
                    ? "프리미엄 기능은 현재 준비 중입니다.\n아래 버튼을 누르시면 정식 출시 시\n50% 할인 쿠폰을 보내드릴게요."
                    : "Premium features are coming soon.\nRegister below to receive a\n50% discount coupon at launch."}
                </p>
                <p className="text-text-faint text-xs">
                  {user?.email}
                </p>
                <button
                  onClick={handleInterest}
                  disabled={sending}
                  className="w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-bg-hover text-text rounded-xl text-sm font-medium transition-colors"
                >
                  {sending
                    ? (isKo ? "등록 중..." : "Registering...")
                    : (isKo ? "알림 받기" : "Notify Me")}
                </button>
                <button
                  onClick={() => setShowInterest(false)}
                  className="w-full py-2 text-sm text-text-faint hover:text-text-secondary transition-colors"
                >
                  {isKo ? "닫기" : "Close"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
