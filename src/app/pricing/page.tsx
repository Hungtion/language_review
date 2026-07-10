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
          {isKo ? "AI 기능 1회 = Leaf 1장 (매일 무료 5회)" : "1 AI use = 1 leaf (5 free daily)"}
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
