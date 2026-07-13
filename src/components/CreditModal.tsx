"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/useLocale";

export default function CreditModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { locale } = useLocale();
  const isKo = locale === "ko";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-bg-card border border-border-light rounded-2xl p-6 max-w-sm w-full text-center space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="text-3xl">🍃</div>
        <h3 className="text-text font-bold text-lg">
          {isKo ? "Leaf가 부족해요!" : "Not enough Leaves!"}
        </h3>
        <p className="text-text-muted text-sm leading-relaxed whitespace-pre-line">
          {isKo
            ? "카드를 복습하고 Leaf를 모아볼까요?\n또는 Leaf를 충전할 수도 있어요."
            : "Review cards to earn Leaves,\nor top up to continue."}
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => { onClose(); router.push("/review"); }}
            className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-sm font-medium transition-colors"
          >
            {isKo ? "카드 복습하러 가기" : "Go Review Cards"}
          </button>
          <button
            onClick={() => { onClose(); router.push("/pricing"); }}
            className="w-full py-2.5 bg-bg-input hover:bg-bg-hover text-text-secondary rounded-xl text-sm transition-colors"
          >
            {isKo ? "Leaf 충전하기" : "Top Up Leaves"}
          </button>
        </div>
      </div>
    </div>
  );
}
