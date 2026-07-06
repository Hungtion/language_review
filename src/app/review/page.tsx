"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase, StudySession } from "@/lib/supabase";
import { parseVocabulary, parseSentences } from "@/lib/parser";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";

const ADMIN_EMAIL = "kei9oon@gmail.com";

type Card = {
  front: string;
  back: string;
  type: "vocab" | "sentence";
  sessionDate: string;
  language: "english" | "japanese";
};

function ReviewContent() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<"english" | "japanese">("english");
  const [cardType, setCardType] = useState<"all" | "vocab" | "sentence">("all");
  const [shuffled, setShuffled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiResults, setAiResults] = useState<Record<number, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaved, setAiSaved] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      let query = supabase
        .from("study_sessions")
        .select("*")
        .order("study_date", { ascending: false });

      query = query.eq("language", filter);

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

        if (session.stress_pronunciation) {
          const sents = parseSentences(session.stress_pronunciation);
          for (const s of sents) {
            built.push({
              front: s,
              back: "",
              type: "vocab",
              sessionDate: date,
              language: lang,
            });
          }
        }

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
              back: "",
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
      setAiResults({});
      setAiSaved({});
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

  function handleTts() {
    if (!card) return;
    speechSynthesis.cancel();
    let text = card.front;
    if (card.language === "japanese") {
      text = text.replace(/[（(][^）)]*[）)]/g, "");
    }
    const utter = new SpeechSynthesisUtterance(text.trim());
    utter.lang = card.language === "japanese" ? "ja-JP" : "en-US";
    utter.rate = 0.9;
    speechSynthesis.speak(utter);
  }

  async function handleAi() {
    if (!isAdmin || aiLoading) return;
    if (aiResults[index]) return;
    const card = cards[index];
    setAiLoading(true);

    const isJP = card.language === "japanese";
    const langLabel = isJP ? "일본어" : "영어";
    const prompt = card.type === "vocab"
      ? `"${card.front}"를 활용한 자연스러운 ${langLabel} 예문 하나를 답해. 다른 부연설명은 필요없고 문장만 말해.`
      : `"${card.front}" 이 문장에서 사용된 숙어나 표현을 이용하여, 다른 상황에서 사용할 수 있는 ${langLabel} 문장 하나를 답해. 다른 부연설명은 필요없고 문장만 말해.`;

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, userEmail: user?.email, action: "review" }),
      });
      const data = await res.json();
      setAiResults((prev) => ({ ...prev, [index]: data.result || data.error || "No response" }));
    } catch {
      setAiResults((prev) => ({ ...prev, [index]: "AI 요청에 실패했습니다." }));
    }
    setAiLoading(false);
  }

  async function handleSaveAiResult() {
    const result = aiResults[index];
    const card = cards[index];
    if (!result || !card || !user) return;

    // Find existing "AI Examples" note for same language
    const { data: existing } = await supabase
      .from("study_sessions")
      .select("id, sentence_grammar")
      .eq("user_id", user.id)
      .eq("title", "AI Examples")
      .eq("language", card.language)
      .single();

    let error;
    if (existing) {
      const updated = existing.sentence_grammar
        ? existing.sentence_grammar + "\n" + result
        : result;
      ({ error } = await supabase
        .from("study_sessions")
        .update({ sentence_grammar: updated, raw_input: updated })
        .eq("id", existing.id));
    } else {
      const today = new Date().toISOString().split("T")[0];
      ({ error } = await supabase.from("study_sessions").insert({
        user_id: user.id,
        language: card.language,
        study_date: today,
        title: "AI Examples",
        sentence_grammar: result,
        raw_input: result,
      }));
    }

    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }

    const newCard: Card = {
      front: result,
      back: "",
      type: "sentence",
      sessionDate: existing ? "" : new Date().toISOString().split("T")[0],
      language: card.language,
    };
    setCards((prev) => [...prev, newCard]);
    setAiSaved((prev) => ({ ...prev, [index]: true }));
  }

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
        if (cards[index]?.back) setFlipped((f) => !f);
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
    longPressTimer.current = setTimeout(() => {
      const card = cards[index];
      if (card) {
        navigator.clipboard.writeText(card.front);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    }, 600);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) goNext();
    else goPrev();
  }

  if (loading) {
    return <div className="text-gray-500 text-center py-12">로딩 중...</div>;
  }

  const card = cards.length > 0 ? cards[index] : null;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0a0a0a] overflow-hidden touch-none" style={{ top: "calc(3.5rem + env(safe-area-inset-top))", overscrollBehavior: "none" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold">카드</h1>
        <span className="text-sm text-gray-500">
          {cards.length > 0 ? `${index + 1} / ${cards.length}` : "0 / 0"}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center px-4 pb-3">
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          {(["english", "japanese"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                filter === f
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {f === "english" ? "EN" : "JP"}
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

      {/* Card + AI */}
      {card ? (
        <div
          className="flex-1 px-4 flex flex-col items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className={`card-flip select-none w-full max-w-lg ${card.back ? "cursor-pointer" : ""}`}
            onClick={() => card.back && setFlipped((f) => !f)}
            style={{ height: "min(50vh, 350px)" }}
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
                  <button
                    onClick={(e) => { e.stopPropagation(); handleTts(); }}
                    className="text-gray-500 hover:text-white transition-colors ml-auto"
                    aria-label="발음 듣기"
                  >
                    🔊
                  </button>
                </div>
                <p className="text-xl text-center font-medium leading-relaxed">
                  {card.front}
                </p>
                {copied && (
                  <span className="absolute bottom-3 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">copied</span>
                )}
              </div>

              {/* Back */}
              <div className="card-back absolute inset-0 bg-gray-900 border border-indigo-500/30 rounded-2xl p-8 flex flex-col items-center justify-center">
                <pre className="text-lg text-center whitespace-pre-wrap font-sans leading-relaxed text-gray-300">
                  {card.back}
                </pre>
              </div>
            </div>
          </div>

          {/* AI Panel - attached to card */}
          {isAdmin && (
            <div className="w-full max-w-lg mt-3">
              {aiLoading ? (
                <div className="bg-gray-900 border border-purple-500/30 rounded-lg p-3">
                  <p className="text-purple-400 text-sm animate-pulse">AI 분석 중...</p>
                </div>
              ) : aiResults[index] ? (
                <div className="bg-gray-900 border border-purple-500/30 rounded-lg p-3 max-h-28 overflow-y-auto touch-auto">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{aiResults[index]}</pre>
                  <div className="flex justify-end mt-2">
                    {aiSaved[index] ? (
                      <span className="text-xs text-green-400">저장됨</span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSaveAiResult(); }}
                        className="text-xs px-2 py-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded hover:bg-indigo-600/30 transition-colors"
                      >
                        카드에 추가
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleAi}
                  className="w-full py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-600/30 transition-colors"
                >
                  AI Examples
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">해당 필터에 복습할 카드가 없습니다.</p>
        </div>
      )}

      {/* Bottom Progress */}
      <div className="px-4 pb-6 pt-3">
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: cards.length > 0 ? `${((index + 1) / cards.length) * 100}%` : "0%" }}
          />
        </div>
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
