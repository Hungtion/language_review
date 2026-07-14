"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useLocale } from "@/lib/useLocale";

type Item = { icon: string; ko: string; en: string };
type Page = { icon?: string; image?: string; titleKo: string; titleEn: string; items: Item[] };

const PAGES: Page[] = [
  {
    icon: "📖",
    titleKo: "Language LAB에 오신 것을 환영합니다!",
    titleEn: "Welcome to Language LAB!",
    items: [
      { icon: "✏️", ko: "학습 내용을 기록하면 복습 카드가 자동 생성", en: "Notes automatically become flashcards" },
      { icon: "🃏", ko: "카드를 스와이프하며 복습하세요", en: "Review by swiping through cards" },
      { icon: "🎤", ko: "소리내어 읽으며 발음을 체크해 보세요", en: "Get pronunciation feedback with Read Aloud" },
      { icon: "📅", ko: "활동 캘린더로 학습 습관을 만들어 보세요", en: "Track your progress with the activity calendar" },
    ],
  },
  {
    icon: "🔬",
    titleKo: "LAB 기능으로 더 똑똑하게",
    titleEn: "Learn smarter with LAB",
    items: [
      { icon: "🗣️", ko: "Nuance Chat으로 자연스러운 표현을 배우세요", en: "Learn natural expressions with Nuance Chat" },
      { icon: "🔬", ko: "LAB Examples로 예문을 생성하세요", en: "Generate example sentences with LAB Examples" },
      { icon: "🖼️", ko: "사진이나 파일로도 노트를 추가할 수 있어요 (beta)", en: "Add notes from photos or files too (beta)" },
    ],
  },
  {
    icon: "🌱",
    titleKo: "LAB & Leaf",
    titleEn: "LAB & Leaf",
    items: [
      { icon: "🌱", ko: "매일 주어지는 5개의 잎사귀로 가볍게 시작해 보세요", en: "Start light with 5 free leaves every day" },
      { icon: "🌿", ko: "연속으로 학습하고 보너스 잎을 획득하세요", en: "Study consistently and earn bonus leaves" },
      { icon: "🌳", ko: "매일의 학습이 나만의 울창한 숲이 됩니다", en: "Daily learning grows into your own lush forest" },
    ],
  },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const [page, setPage] = useState(0);
  const touchStartX = useRef(0);

  const current = PAGES[page];
  const isLast = page === PAGES.length - 1;

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (dx > 50 && page < PAGES.length - 1) setPage(page + 1);
    else if (dx < -50 && page > 0) setPage(page - 1);
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-bg flex flex-col items-center px-6"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="max-w-sm w-full space-y-8 text-center" style={{ marginTop: "25vh" }}>
        {current.image ? (
          <Image src={current.image} alt="" width={96} height={96} className="mx-auto rounded-2xl" />
        ) : (
          <div className="text-6xl">{current.icon}</div>
        )}
        <h1 className="text-lg sm:text-xl font-bold text-text">
          {isKo ? current.titleKo : current.titleEn}
        </h1>
        <div className="space-y-4 text-left">
          {current.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xl shrink-0">{item.icon}</span>
              <span className="text-xs sm:text-sm text-text-secondary">{isKo ? item.ko : item.en}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute left-0 right-0 flex flex-col items-center gap-4 px-6" style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}>
        {/* Dots */}
        <div className="flex gap-2">
          {PAGES.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === page ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={() => {
            if (isLast) {
              localStorage.setItem("onboarding-done", "1");
              onDone();
            } else {
              setPage(page + 1);
            }
          }}
          className="w-full max-w-xs py-3 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-sm font-medium transition-colors"
        >
          {isLast
            ? (isKo ? "시작하기" : "Get Started")
            : (isKo ? "다음" : "Next")}
        </button>

        <button
          onClick={() => { localStorage.setItem("onboarding-done", "1"); onDone(); }}
          className={`text-sm transition-colors ${isLast ? "invisible" : "text-text-muted hover:text-text"}`}
        >
          {isKo ? "건너뛰기" : "Skip"}
        </button>
      </div>
    </div>
  );
}
