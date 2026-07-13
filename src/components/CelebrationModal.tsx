"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/useLocale";

type Props = {
  type: "daily" | "streak";
  leafEarned: number;
  streakDays?: number;
  onClose: () => void;
};

export default function CelebrationModal({ type, leafEarned, streakDays, onClose }: Props) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number; size: number }[]>([]);

  useEffect(() => {
    const p = Array.from({ length: type === "streak" ? 20 : 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -(Math.random() * 40 + 10),
      delay: Math.random() * 0.8,
      size: Math.random() * 12 + 8,
    }));
    setParticles(p);
  }, [type]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9998] px-4" onClick={onClose}>
      {/* Falling leaves */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <svg
            key={p.id}
            viewBox="0 0 24 24"
            fill="currentColor"
            className="absolute text-green-400 animate-leaf-fall"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              opacity: 0.8,
            }}
          >
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
          </svg>
        ))}
      </div>

      <div
        className="bg-bg-card border border-border-light rounded-2xl p-6 max-w-sm w-full text-center space-y-4 animate-bounce-in relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {type === "streak" ? (
          <>
            <div className="text-5xl">💧</div>
            <h3 className="text-xl font-bold text-text">
              {isKo
                ? `${streakDays}일 연속 출석 달성!`
                : `${streakDays}-Day Streak!`}
            </h3>
            <p className="text-text-muted text-sm">
              {isKo
                ? `보너스 Leaf ${leafEarned}개를 획득했습니다!`
                : `You earned ${leafEarned} bonus Leaves!`}
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl">🍃</div>
            <h3 className="text-xl font-bold text-text">
              {isKo ? "오늘의 학습 완료!" : "Daily Study Done!"}
            </h3>
            <p className="text-text-muted text-sm">
              {isKo
                ? `Leaf ${leafEarned}개를 획득했습니다!`
                : `You earned ${leafEarned} Leaf!`}
            </p>
          </>
        )}

        <div className="flex items-center justify-center gap-1 text-2xl font-bold text-primary">
          <span>🍃</span>
          <span>+{leafEarned}</span>
        </div>

        <button
          onClick={onClose}
          className="px-8 py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-sm font-medium transition-colors"
        >
          {isKo ? "확인" : "OK"}
        </button>
      </div>
    </div>
  );
}
