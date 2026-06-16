"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, StudySession } from "@/lib/supabase";
import { parseVocabulary, parseSentences } from "@/lib/parser";

type Card = {
  front: string;
  back: string;
  type: "vocab" | "sentence";
  sessionDate: string;
  language: "english" | "japanese";
};

export default function ReviewPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<"all" | "english" | "japanese">("all");
  const [cardType, setCardType] = useState<"all" | "vocab" | "sentence">("all");
  const [shuffled, setShuffled] = useState(false);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">복습 카드</h1>
        <span className="text-sm text-gray-500">
          {index + 1} / {cards.length}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
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
        className="card-flip cursor-pointer select-none"
        onClick={() => setFlipped((f) => !f)}
        style={{ minHeight: "280px" }}
      >
        <div className={`card-inner relative w-full ${flipped ? "flipped" : ""}`} style={{ minHeight: "280px" }}>
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

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-700 rounded-lg text-sm transition-colors"
        >
          이전
        </button>

        {/* Progress bar */}
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

      {/* Keyboard hint */}
      <p className="text-center text-xs text-gray-700">
        Space/Enter: 뒤집기 &nbsp;|&nbsp; 화살표: 이전/다음
      </p>
    </div>
  );
}
