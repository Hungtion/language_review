"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/useLocale";
import Link from "next/link";

type WrongCard = {
  front: string;
  back: string;
  type: "vocab" | "sentence";
  language: "english" | "japanese";
  wrongCount?: number;
};

function WrongNotesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = (searchParams.get("lang") as "english" | "japanese") || "english";
  const { locale } = useLocale();
  const [cards, setCards] = useState<WrongCard[]>([]);

  useEffect(() => {
    try {
      const data: WrongCard[] = JSON.parse(localStorage.getItem("wrong-cards") || "[]");
      setCards(data.filter(c => c.language === lang));
    } catch {
      setCards([]);
    }
  }, [lang]);

  const vocabCards = cards.filter(c => c.type === "vocab");
  const sentCards = cards.filter(c => c.type === "sentence");

  const removeCard = (card: WrongCard) => {
    try {
      const all: WrongCard[] = JSON.parse(localStorage.getItem("wrong-cards") || "[]");
      const filtered = all.filter(c => !(c.front === card.front && c.language === card.language));
      localStorage.setItem("wrong-cards", JSON.stringify(filtered));
      setCards(prev => prev.filter(c => !(c.front === card.front && c.language === card.language)));
    } catch {}
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-text-faint hover:text-text transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-lg font-semibold">
          {locale === "ko" ? "오답노트" : "Wrong Notes"}
          <span className="text-text-faint text-sm ml-2">{lang === "english" ? "EN" : "JP"}</span>
        </h1>
        <button
          onClick={() => {
            if (cards.length === 0) return;
            if (confirm(locale === "ko" ? "오답노트를 초기화할까요?" : "Clear all wrong cards?")) {
              const all: WrongCard[] = JSON.parse(localStorage.getItem("wrong-cards") || "[]");
              const remaining = all.filter(c => c.language !== lang);
              localStorage.setItem("wrong-cards", JSON.stringify(remaining));
              setCards([]);
            }
          }}
          className="p-2 -mr-2 text-text-faint hover:text-red-400 transition-colors"
          title={locale === "ko" ? "초기화" : "Clear"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>

      {/* Action buttons */}
      {cards.length > 0 && (
        <div className="flex gap-2 px-4 pb-3">
          <Link
            href={`/review?mode=wrong`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-bg-card border border-border rounded-xl text-sm font-medium text-text-muted hover:border-primary/50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="14" height="17" rx="2" /><path d="M8 2h10a2 2 0 012 2v14" />
            </svg>
            {locale === "ko" ? "카드 복습" : "Review"}
          </Link>
          <Link
            href={`/review?mode=wrong&quiz=1`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-hover rounded-xl text-sm font-medium transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
            {locale === "ko" ? "퀴즈 풀기" : "Quiz"}
          </Link>
        </div>
      )}

      {/* Empty state */}
      {cards.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-2">
            <p className="text-text-muted text-sm">
              {locale === "ko" ? "오답 카드가 없습니다." : "No wrong cards."}
            </p>
            <p className="text-text-faint text-xs">
              {locale === "ko" ? "퀴즈에서 틀리면 여기에 자동으로 추가됩니다." : "Cards you get wrong in quizzes will appear here."}
            </p>
          </div>
        </div>
      )}

      {/* Card list - note detail style */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-6">
        {vocabCards.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-text-faint px-1 pb-1">
              {locale === "ko" ? "어휘" : "Vocabulary"} ({vocabCards.length})
            </h3>
            <div className="bg-bg-card border border-border rounded-xl divide-y divide-border">
              {vocabCards.map((card, i) => (
                <div key={`v-${i}`} className="flex items-start justify-between px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{card.front}</div>
                    {card.back && <div className="text-text-faint text-xs mt-0.5">{card.back}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {card.wrongCount && card.wrongCount > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">{card.wrongCount}회</span>
                    )}
                    <button
                      onClick={() => removeCard(card)}
                      className="text-text-faint hover:text-red-400 transition-colors p-0.5"
                      title={locale === "ko" ? "삭제" : "Remove"}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {sentCards.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-text-faint px-1 pb-1">
              {locale === "ko" ? "문장" : "Sentences"} ({sentCards.length})
            </h3>
            <div className="bg-bg-card border border-border rounded-xl divide-y divide-border">
              {sentCards.map((card, i) => (
                <div key={`s-${i}`} className="flex items-start justify-between px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-relaxed">{card.front}</div>
                    {card.back && <div className="text-text-faint text-xs mt-0.5">{card.back}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {card.wrongCount && card.wrongCount > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">{card.wrongCount}회</span>
                    )}
                    <button
                      onClick={() => removeCard(card)}
                      className="text-text-faint hover:text-red-400 transition-colors p-0.5"
                      title={locale === "ko" ? "삭제" : "Remove"}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WrongNotesPage() {
  return (
    <Suspense>
      <WrongNotesContent />
    </Suspense>
  );
}
