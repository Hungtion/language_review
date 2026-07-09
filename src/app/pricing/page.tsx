"use client";

import { useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useLocale } from "@/lib/useLocale";

function PricingContent() {
  const { user, plan } = useAuth();
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
        <p className="text-gray-400 text-sm">
          {isKo ? "AI 기능을 무제한으로 사용하세요" : "Unlimited access to AI features"}
        </p>
      </div>

      {plan === "pro" && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 text-center">
          <p className="text-indigo-400 text-sm font-medium">
            {isKo ? "현재 프리미엄 이용 중입니다" : "You are on Premium"}
          </p>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold">
            1,000<span className="text-lg text-gray-400 font-normal">
              {isKo ? "원/월" : "KRW/mo"}
            </span>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-green-400">✓</span>
            <span className="text-gray-300">
              {isKo ? "Nuance Chat 무제한" : "Unlimited Nuance Chat"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-400">✓</span>
            <span className="text-gray-300">
              {isKo ? "AI 자동 분류 무제한" : "Unlimited AI auto-parsing"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-400">✓</span>
            <span className="text-gray-300">
              {isKo ? "복습 카드 AI 예문 무제한" : "Unlimited AI example sentences"}
            </span>
          </div>
        </div>

        {plan !== "pro" && (
          <div className="space-y-3 pt-2">
            <button
              onClick={() => setShowInterest(true)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
            >
              {isKo ? "프리미엄 구독하기" : "Subscribe to Premium"}
            </button>
            <a
              href="https://qr.kakaopay.com/Ej7lvEtQc"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#191919" d="M12 3C6.48 3 2 6.44 2 10.65c0 2.68 1.78 5.05 4.48 6.42-.15.54-.97 3.5-.99 3.7 0 0-.02.17.09.23.11.07.24.01.24.01.32-.04 3.7-2.44 4.28-2.86.6.09 1.23.13 1.9.13 5.52 0 10-3.44 10-7.65S17.52 3 12 3z"/>
              </svg>
              {isKo ? "카카오페이로 후원하기" : "Support via KakaoPay"}
            </a>
          </div>
        )}
      </div>

      {/* 관심 등록 팝업 */}
      {showInterest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setShowInterest(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            {registered ? (
              <>
                <div className="text-3xl">🎉</div>
                <p className="text-white text-[15px] leading-relaxed whitespace-pre-line">
                  {isKo
                    ? "등록 완료!\n정식 출시 시 할인 쿠폰을 보내드릴게요."
                    : "Registered!\nWe'll send you a discount coupon at launch."}
                </p>
                <button
                  onClick={() => setShowInterest(false)}
                  className="mt-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {isKo ? "확인" : "OK"}
                </button>
              </>
            ) : (
              <>
                <div className="text-3xl">✨</div>
                <h3 className="text-white font-bold text-lg">
                  {isKo ? "오픈 베타 준비 중!" : "Open Beta Coming Soon!"}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                  {isKo
                    ? "프리미엄 기능은 현재 준비 중입니다.\n아래 버튼을 누르시면 정식 출시 시\n50% 할인 쿠폰을 보내드릴게요."
                    : "Premium features are coming soon.\nRegister below to receive a\n50% discount coupon at launch."}
                </p>
                <p className="text-gray-500 text-xs">
                  {user?.email}
                </p>
                <button
                  onClick={handleInterest}
                  disabled={sending}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {sending
                    ? (isKo ? "등록 중..." : "Registering...")
                    : (isKo ? "알림 받기" : "Notify Me")}
                </button>
                <button
                  onClick={() => setShowInterest(false)}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
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
