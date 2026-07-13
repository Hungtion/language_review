"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/useLocale";

const PACKAGES = [
  { credits: 10, price: 1000, originalPrice: 1000, icon: "🌱", discount: 0 },
  { credits: 20, price: 1800, originalPrice: 2000, icon: "🌿", discount: 10 },
  { credits: 50, price: 4000, originalPrice: 5000, icon: "🌳", discount: 20 },
];

function PricingContent() {
  const { user, credits, refreshCredits } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const [selected, setSelected] = useState(1);
  const [loading, setLoading] = useState(false);

  const isKo = locale === "ko";
  const pkg = PACKAGES[selected];
  const done = searchParams.get("done") === "1";

  // After returning from payment, refresh credits
  if (done && user) {
    refreshCredits();
  }

  async function handlePay() {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payment/payapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          price: pkg.price,
          goodname: `Leaf ${pkg.credits}`,
        }),
      });
      const data = await res.json();
      if (data.url) {
        // Mobile: navigate directly, PC: new tab (avoids popup blockers)
        const isMobile = /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = data.url;
        } else {
          window.open(data.url, "_blank");
        }
      } else {
        alert(data.error || "Payment failed");
      }
    } catch {
      alert("Payment request failed");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">
          {isKo ? "🌱 Leaf 충전" : "🌱 Top Up"}
        </h1>
        <p className="text-text-muted text-sm">
          {isKo ? "LAB 1회 = Leaf 1장 (매일 무료 3회)" : "1 LAB use = 1 Leaf (3 free daily)"}
        </p>
      </div>

      {done && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
          <p className="text-green-400 text-sm">
            {isKo ? "✅ 결제가 완료되었습니다! Leaf이 충전됩니다." : "✅ Payment complete! Leaves will be added."}
          </p>
        </div>
      )}

      <div className="bg-bg-card border border-border rounded-xl p-5 text-center">
        <p className="text-text-muted text-xs mb-1">{isKo ? "보유 Leaf" : "Your Leaves"}</p>
        <p className="text-3xl font-bold text-primary">{credits === 0 ? "🍃" : credits <= 10 ? "🌱" : credits <= 50 ? "🌿" : "🌳"} {credits}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {PACKAGES.map((p, i) => (
          <button
            key={p.credits}
            onClick={() => setSelected(i)}
            className={`p-4 rounded-xl border transition-colors text-center ${
              selected === i
                ? "bg-primary/15 border-primary/40"
                : "bg-bg-card border-border hover:border-primary/20"
            }`}
          >
            <p className="text-2xl mb-1">{p.icon}</p>
            <p className="text-xl font-bold text-text">{p.credits}<span className="text-sm text-text-muted font-normal ml-0.5">Leaf</span></p>
            {p.discount > 0 && (
              <p className="text-xs text-text-faint line-through">{p.originalPrice.toLocaleString()}{isKo ? "원" : " KRW"}</p>
            )}
            <p className="text-sm text-text-secondary mt-0.5">{p.price.toLocaleString()}{isKo ? "원" : " KRW"}</p>
            {p.discount > 0 && (
              <span className="text-[10px] text-primary font-medium">-{p.discount}%</span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-text rounded-lg text-sm font-medium transition-colors"
        >
          {loading
            ? (isKo ? "결제 준비 중..." : "Preparing...")
            : (isKo ? "결제하기" : "Pay Now")}
        </button>
        <button
          onClick={() => router.back()}
          className="w-full py-3 bg-bg-input hover:bg-bg-hover text-text-secondary rounded-lg text-sm transition-colors"
        >
          {isKo ? "돌아가기" : "Go Back"}
        </button>
      </div>

      <p className="text-xs text-text-faint text-center">
        {isKo ? "네이버페이 · 페이코 · 애플페이 · 카드 · 계좌이체" : "NaverPay · Payco · ApplePay · Card · Bank Transfer"}
      </p>
      <p className="text-xs text-text-faint text-center">
        {isKo ? "Leaf는 구매 후 환불이 불가합니다." : "Leaf credits are non-refundable."}
      </p>

      {/* Leaf Policy */}
      <div className="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-text">
          {isKo ? "Leaf 란?" : "What is Leaf?"}
        </h2>

        <div>
          <p className="text-xs text-text-muted leading-relaxed">
            {isKo
              ? "Leaf는 LAB 기능(Nuance 채팅, LAB Example, 카드 나누기)을 사용할 때 필요한 크레딧입니다. LAB 기능 1회 사용 시 Leaf 1장이 차감됩니다."
              : "Leaf is a credit used to access LAB features (Nuance chat, LAB Example, Card split). Each LAB use costs 1 Leaf."}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-green-500 mb-1">
            {isKo ? "획득 방법" : "How to Earn"}
          </h3>
          <ul className="text-xs text-text-muted space-y-1">
            <li className="flex justify-between">
              <span>{isKo ? "카드 복습 5장" : "Review 5 cards"}</span>
              <span className="text-green-500 font-medium">+1 Leaf</span>
            </li>
            <li className="flex justify-between">
              <span>{isKo ? "노트 추가 1개" : "Add 1 note"}</span>
              <span className="text-green-500 font-medium">+1 Leaf</span>
            </li>
          </ul>
          <p className="text-[10px] text-text-faint mt-1.5">
            {isKo ? "* 일일 최대 획득 : 5 Leaf" : "* Daily max earn: 5 Leaf"}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-blue-400 mb-1">
            {isKo ? "연속 학습 보너스" : "Study Streak Bonus"}
          </h3>
          <ul className="text-xs text-text-muted space-y-1">
            <li className="flex justify-between">
              <span>{isKo ? "3일 연속" : "3-day streak"}</span>
              <span className="text-blue-400 font-medium">+1 Leaf</span>
            </li>
            <li className="flex justify-between">
              <span>{isKo ? "7일 연속" : "7-day streak"}</span>
              <span className="text-blue-400 font-medium">+3 Leaf</span>
            </li>
            <li className="flex justify-between">
              <span>{isKo ? "14일 연속" : "14-day streak"}</span>
              <span className="text-blue-400 font-medium">+5 Leaf</span>
            </li>
            <li className="flex justify-between">
              <span>{isKo ? "30일 연속" : "30-day streak"}</span>
              <span className="text-blue-400 font-medium">+10 Leaf</span>
            </li>
          </ul>
          <p className="text-[10px] text-text-faint mt-1.5">
            {isKo ? "* 학습 인정 조건 : 카드 복습 5장 / 노트 추가 1개 / Nuance 1회 중 하나 이상" : "* Study criteria: review 5+ cards / add 1+ note / 1+ Nuance chat"}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-red-400 mb-1">
            {isKo ? "차감 기준" : "How It's Spent"}
          </h3>
          <ul className="text-xs text-text-muted space-y-1">
            <li className="flex justify-between">
              <span>Nuance {isKo ? "채팅" : "chat"}</span>
              <span className="text-red-400 font-medium">-1 Leaf</span>
            </li>
            <li className="flex justify-between">
              <span>LAB Example</span>
              <span className="text-red-400 font-medium">-1 Leaf</span>
            </li>
            <li className="flex justify-between">
              <span>{isKo ? "카드 나누기" : "Card split"}</span>
              <span className="text-red-400 font-medium">-1 Leaf</span>
            </li>
          </ul>
          <p className="text-[10px] text-text-faint mt-1.5">
            {isKo ? "* 일일 무료 3회 제공 (내 Leaf 미차감)" : "* 3 free uses daily (no Leaf deducted)"}
          </p>
        </div>
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
