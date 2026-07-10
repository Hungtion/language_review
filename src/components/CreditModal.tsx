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
        <div className="text-3xl">💳</div>
        <h3 className="text-text font-bold text-lg">
          {isKo ? "🍃 Leaf가 부족합니다" : "🍃 Not enough leaves"}
        </h3>
        <p className="text-text-muted text-sm leading-relaxed whitespace-pre-line">
          {isKo
            ? "오늘의 무료 사용량을 모두 사용했어요.\nLeaf를 충전하면 계속 이용할 수 있습니다."
            : "You've used all free uses today.\nGet more leaves to continue."}
        </p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-bg-input hover:bg-bg-hover text-text-secondary rounded-xl text-sm transition-colors"
          >
            {isKo ? "닫기" : "Close"}
          </button>
          <button
            onClick={() => { onClose(); router.push("/pricing"); }}
            className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-sm font-medium transition-colors"
          >
            {isKo ? "충전하기" : "Top Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
