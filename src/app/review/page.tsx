"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase, StudySession } from "@/lib/supabase";
import { parseVocabulary, parseSentences } from "@/lib/parser";
import RequireAuth from "@/components/RequireAuth";

type Card = {
  front: string;
  back: string;
  type: "vocab" | "sentence";
  sessionDate: string;
  language: "english" | "japanese";
};

function ReviewContent() {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<"all" | "english" | "japanese">("all");
  const [cardType, setCardType] = useState<"all" | "vocab" | "sentence">("all");
  const [shuffled, setShuffled] = useState(false);
  const [loading, setLoading] = useState(true);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    async function load() {
      let query = supabase
        .from("study_sessions")
        .select("*")
        .order("study_date", { ascending: false });

      if (filter !== "all") {
        query = query.eq("language", filter);
      }

      const { data } = await query;
      if (!data) {
        setCards([]);
        setLoading(false);
        return;
      }

      const built: Card[] = [];

      for (const session of data) {
        const lang = session.language as "english" | "japanese";
        const date = session.study_date;

        if (session.vocabulary) {
          const entries = parseVocabulary(session.vocabulary);
          for (const v of entries) {
            built.push({
              front: v.term,
              back: v.definition + (v.example ? `\n\ne.g. ${v.example}` : ""),
              type: "vocab",
              sessionDate: date,
              language: lang,
            });
          }
        }

        if (session.sentence_grammar) {
          const sents = parseSentences(session.sentence_grammar);
          for (const s of sents) {
            built.push({
              front: s,
              back: "Read aloud & internalize",
              type: "sentence",
              sessionDate: date,
              language: lang,
            });
          }
        }
      }

      let filtered = built;
      if (cardType !== "all") {
        filtered = built.filter((c) => c.type === cardType);
      }

      if (shuffled) {
        for (let i = filtered.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
        }
      }

      setCards(filtered);
      setIndex(0);
      setFlipped(false);
      setLoading(false);
    }
    load();
  }, [filter, cardType, shuffled]);

  const goNext = useCallback(() => {
    if (index < cards.length - 1) {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  }, [index, cards.length]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setIndex((i) => i - 1);
      setFlipped(false);
    }
  }, [index]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        goPrev();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) goNext();
    else goPrev();
  }

  if (loading) {
    return <div className="text-gray-500 text-center py-12">로딩 중...</div>;
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-2">복습할 카드가 없습니다.</p>
        <p className="text-gray-600 text-sm">노트를 먼저 입력해주세요.</p>
      </div>
    );
  }

  const card = cards[index];

  return (
    <div className="fixed inset-0 top-14 flex flex-col bg-[#0a0a0a] overflow-hidden touch-none" style={{ overscrollBehavior: "none" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold">카드</h1>
        <span className="text-sm text-gray-500">
          {index + 1} / {cards.length}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center px-4 pb-3">
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          {(["all", "english", "japanese"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                filter === f
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {f === "all" ? "전체" : f === "english" ? "EN" : "JP"}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          {(["all", "vocab", "sentence"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setCardType(t)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                cardType === t
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {t === "all" ? "전체" : t === "vocab" ? "어휘" : "문장"}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShuffled((s) => !s)}
          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
            shuffled
              ? "bg-indigo-600 text-white"
              : "bg-gray-900 text-gray-400 hover:text-gray-200"
          }`}
        >
          셔플
        </button>
      </div>

      {/* Card */}
      <div
        className="flex-1 px-4 flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="card-flip cursor-pointer select-none w-full max-w-lg"
          onClick={() => setFlipped((f) => !f)}
          style={{ height: "min(60vh, 400px)" }}
        >
          <div className={`card-inner relative w-full h-full ${flipped ? "flipped" : ""}`}>
            {/* Front */}
            <div className="card-front absolute inset-0 bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    card.language === "english"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {card.language === "english" ? "EN" : "JP"}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    card.type === "vocab"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {card.type === "vocab" ? "어휘" : "문장"}
                </span>
                <span className="text-xs text-gray-600">{card.sessionDate}</span>
              </div>
              <p className="text-xl text-center font-medium leading-relaxed">
                {card.front}
              </p>
              <p className="text-xs text-gray-600 mt-6">탭하여 뒤집기</p>
            </div>

            {/* Back */}
            <div className="card-back absolute inset-0 bg-gray-900 border border-indigo-500/30 rounded-2xl p-8 flex flex-col items-center justify-center">
              <pre className="text-lg text-center whitespace-pre-wrap font-sans leading-relaxed text-gray-300">
                {card.back}
              </pre>
              <p className="text-xs text-gray-600 mt-6">탭하여 뒤집기</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="px-4 pb-6 pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={index === 0}
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-700 rounded-lg text-sm transition-colors"
          >
            이전
          </button>

          <div className="flex-1 mx-4">
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${((index + 1) / cards.length) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={goNext}
            disabled={index === cards.length - 1}
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-700 rounded-lg text-sm transition-colors"
          >
            다음
          </button>
        </div>

        <p className="text-center text-xs text-gray-700">
          스와이프 또는 화살표: 이전/다음 &nbsp;|&nbsp; 탭/Space: 뒤집기
        </p>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <RequireAuth>
      <ReviewContent />
    </RequireAuth>
  );
}
