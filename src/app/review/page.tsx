"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, StudySession } from "@/lib/supabase";
import { parseVocabulary, parseSentences } from "@/lib/parser";
import { getGuestNotes } from "@/lib/guestStorage";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useTts } from "@/lib/useTts";
import { useLocale } from "@/lib/useLocale";
import { getAiUsage, incrementAiUsage, DAILY_LIMIT, GUEST_LIMIT, getGuestUsage, incrementGuestUsage } from "@/lib/aiUsage";
import GuideOverlay from "@/components/GuideOverlay";

type Card = {
  front: string;
  back: string;
  type: "vocab" | "sentence";
  sessionDate: string;
  language: "english" | "japanese";
};

function ReviewContent() {
  const router = useRouter();
  const { user, plan } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<"english" | "japanese">(() => {
    if (typeof window === "undefined") return "english";
    return (localStorage.getItem("lang-filter") as "english" | "japanese") || "english";
  });
  const [cardType, setCardType] = useState<"all" | "vocab" | "sentence">("all");
  const isEngChannel = typeof window !== "undefined" && localStorage.getItem("eng-channel") === "true";
  const [shuffled, setShuffled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiResults, setAiResults] = useState<Record<number, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaved, setAiSaved] = useState<Record<number, boolean>>({});
  const [aiRemaining, setAiRemaining] = useState<number>(DAILY_LIMIT);
  const [autoplay, setAutoplay] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("tts-autoplay") === "true" : false
  );
  const [pressed, setPressed] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [swipeAnim, setSwipeAnim] = useState<"left" | "right" | null>(null);
  const [enterAnim, setEnterAnim] = useState<"from-left" | "from-right" | "entering" | null>(null);
  const swiping = useRef(false);
  const longPressTriggered = useRef(false);
  const { speak, stop: stopTts } = useTts();
  const { t, locale } = useLocale();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      let data;
      if (!user) {
        data = getGuestNotes().filter((n) => n.language === filter);
      } else {
        const { data: dbData } = await supabase
          .from("study_sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("study_date", { ascending: false })
          .order("created_at", { ascending: false })
          .eq("language", filter);
        data = dbData;
      }
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

      // Guest users limited to 20 cards
      if (!user) {
        filtered = filtered.slice(0, 20);
      }

      stopTts();
      setCards(filtered);
      setIndex(0);
      setFlipped(false);
      setAiResults({});
      setAiSaved({});
      setLoading(false);
    }
    load();
  }, [filter, cardType, shuffled, user]);

  const goNext = useCallback(() => {
    if (index < cards.length - 1) {
      stopTts();
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  }, [index, cards.length]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      stopTts();
      setIndex((i) => i - 1);
      setFlipped(false);
    }
  }, [index]);

  useEffect(() => {
    if (!cards[index] || loading) return;
    if (autoplay) {
      speak(cards[index].front, cards[index].language);
    }
  }, [index, loading]);

  // Load AI usage for free/guest users
  useEffect(() => {
    if (plan === "pro") return;
    if (!user) {
      setAiRemaining(getGuestUsage().remaining);
      return;
    }
    getAiUsage(user.id).then(({ remaining }) => setAiRemaining(remaining));
  }, [user, plan]);

  async function handleAi() {
    if (aiLoading || aiResults[index]) return;

    // Check AI usage limit
    if (plan !== "pro") {
      if (!user) {
        const { remaining } = getGuestUsage();
        if (remaining <= 0) { router.push("/login"); return; }
      } else {
        const { remaining } = await getAiUsage(user.id);
        if (remaining <= 0) { alert(t("aiLimitReached")); return; }
      }
    }
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

      // Increment AI usage on success
      if (plan !== "pro" && data.result) {
        if (!user) {
          const { remaining } = incrementGuestUsage();
          setAiRemaining(remaining);
        } else {
          await incrementAiUsage(user.id);
          const { remaining } = await getAiUsage(user.id);
          setAiRemaining(remaining);
        }
      }
    } catch {
      setAiResults((prev) => ({ ...prev, [index]: t("requestFailed") }));
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
      const today = new Date().toISOString().split("T")[0];
      ({ error } = await supabase
        .from("study_sessions")
        .update({ sentence_grammar: updated, raw_input: updated, study_date: today })
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
    return () => {
      document.body.style.overflow = "";
      stopTts();
    };
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const c = cards[index];
        if (c?.back) {
          if (flipped) { speak(c.back, c.language); setFlipped(false); }
          else { speak(c.front, c.language); setFlipped(true); }
        } else if (c) { speak(c.front, c.language); }
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
    longPressTriggered.current = false;
    swiping.current = false;
    setPressed(true);
    setSwipeX(0);
    setSwipeAnim(null);
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
    }, 600);
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 10 || dy > 10) {
      setPressed(false);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
    if (Math.abs(dx) > 10 && Math.abs(dx) > dy) {
      swiping.current = true;
      setSwipeX(dx);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setPressed(false);
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      setSwipeX(0);
      return;
    }
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (swiping.current && Math.abs(dx) > 50) {
      const dir = dx < 0 ? "left" : "right";
      if ((dir === "left" && index >= cards.length - 1) || (dir === "right" && index <= 0)) {
        setSwipeX(0);
        return;
      }
      setSwipeAnim(dir);
      setTimeout(() => {
        if (dir === "left") goNext(); else goPrev();
        setSwipeAnim(null);
        setSwipeX(0);
        setEnterAnim(dir === "left" ? "from-right" : "from-left");
        setTimeout(() => {
          setEnterAnim("entering");
          setTimeout(() => setEnterAnim(null), 200);
        }, 20);
      }, 200);
      return;
    }
    setSwipeX(0);
    // Quick tap → TTS + flip
    if (!swiping.current) {
      const c = cards[index];
      if (!c) return;
      if (c.back) {
        if (flipped) {
          // Back is showing → read front, flip to front
          speak(c.front, c.language);
          setFlipped(false);
        } else {
          // Front is showing → read front, flip to back
          speak(c.front, c.language);
          setFlipped(true);
        }
      } else {
        // No back → just read front
        speak(c.front, c.language);
      }
    }
  }

  if (loading) {
    return <div className="text-gray-500 text-center py-12">{t("loading")}</div>;
  }

  const card = cards.length > 0 ? cards[index] : null;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0a0a0a] overflow-hidden touch-none sm:pb-0" style={{ top: "calc(3.5rem + env(safe-area-inset-top))", paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom))", overscrollBehavior: "none" }}>
      <GuideOverlay pageKey="review" />
      {/* Filters */}
      <div className="flex items-center justify-between px-4 pt-3 pb-3">
        <div data-guide="review-filters-right" className="flex gap-3 items-center shrink-0">
          <button
            title={locale === "ko" ? "카드를 넘기면 자동으로 발음이 재생됩니다" : "Automatically plays pronunciation when flipping cards"}
            data-guide-tab={`자동\n재생`} data-guide-tab-en={`Auto\nPlay`}
            onClick={() => {
              const next = !autoplay;
              setAutoplay(next);
              localStorage.setItem("tts-autoplay", String(next));
            }}
            className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
              autoplay ? "bg-indigo-600" : "bg-gray-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform flex items-center justify-center text-[8px] font-bold ${
                autoplay ? "translate-x-4 bg-white text-indigo-600" : "translate-x-0 bg-gray-500 text-gray-300"
              }`}
            >
              A
            </span>
          </button>

          <button
            title={locale === "ko" ? "카드 순서를 무작위로 섞습니다" : "Shuffle card order randomly"}
            data-guide-tab="셔플" data-guide-tab-en="Shuffle"
            onClick={() => setShuffled((s) => !s)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors shrink-0 ${
              shuffled
                ? "bg-indigo-600 text-white"
                : "bg-gray-900 text-gray-400 hover:text-gray-200"
            }`}
          >
            🔀
          </button>
        </div>

        <div className="flex gap-2 items-center overflow-x-auto scrollbar-hide flex-nowrap">
          {isEngChannel && (
            <>
              <div data-guide="review-filter-type" className="flex gap-1 bg-gray-900 rounded-lg p-1 shrink-0">
                {(["all", "vocab", "sentence"] as const).map((ct) => (
                  <button
                    key={ct}
                    onClick={() => setCardType(ct)}
                    className={`px-3 py-1 rounded-md text-sm transition-colors ${
                      cardType === ct
                        ? "bg-gray-700 text-white"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {ct === "all" ? t("all") : ct === "vocab" ? t("vocab") : t("sentence")}
                  </button>
                ))}
              </div>

              <div className="w-px h-5 bg-gray-700 shrink-0" />
            </>
          )}

          <div data-guide="review-filter-lang" className="flex gap-1 bg-gray-900 rounded-lg p-1 shrink-0">
            {(["english", "japanese"] as const).map((f) => (
              <button
                key={f}
                title={f === "english" ? (locale === "ko" ? "영어 카드 보기" : "Show English cards") : (locale === "ko" ? "일본어 카드 보기" : "Show Japanese cards")}
                onClick={() => { setFilter(f); localStorage.setItem("lang-filter", f); }}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  filter === f
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {f === "english" ? "🇺🇸" : "🇯🇵"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Card + AI */}
      <div className="flex-1 px-4 flex flex-col items-center justify-center">
        {card ? (
          <>
            <div
              data-guide="review-card"
              className={`card-flip select-none w-full max-w-lg ${card.back ? "cursor-pointer" : ""} ${swipeAnim || enterAnim === "entering" ? "transition-transform duration-200" : swipeX || enterAnim ? "" : "transition-transform duration-150"}`}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                height: "min(50vh, 350px)",
                transform: swipeAnim
                  ? `translateX(${swipeAnim === "left" ? "-120%" : "120%"})`
                  : enterAnim === "from-right"
                    ? "translateX(120%)"
                    : enterAnim === "from-left"
                      ? "translateX(-120%)"
                      : swipeX
                        ? `translateX(${swipeX}px) rotate(${swipeX * 0.03}deg)`
                        : pressed ? "scale(0.95)" : "",
              }}
            >
              <div className={`card-inner relative w-full h-full ${flipped ? "flipped" : ""}`}>
                {/* Front */}
                <div className="card-front absolute inset-0 bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col items-center">
                  {typeof navigator !== "undefined" && navigator.share && (
                    <button
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.share({ text: card.front }).catch(() => {});
                      }}
                      className="absolute top-3 right-3 text-gray-600 hover:text-gray-300 transition-colors text-sm z-10"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    </button>
                  )}
                  <div className="flex items-center gap-2 mb-4 shrink-0">
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
                      {card.type === "vocab" ? t("vocab") : t("sentence")}
                    </span>
                    <span className="text-xs text-gray-600">{card.sessionDate}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center overflow-y-auto w-full">
                    <p className="text-xl text-center font-medium leading-relaxed py-4">
                      {card.front}
                    </p>
                  </div>
                </div>

                {/* Back */}
                <div className="card-back absolute inset-0 bg-gray-900 border border-indigo-500/30 rounded-2xl p-8 flex flex-col items-center justify-center overflow-y-auto">
                  <pre className="text-lg text-center whitespace-pre-wrap font-sans leading-relaxed text-gray-300 py-4">
                    {card.back}
                  </pre>
                </div>
              </div>
            </div>

            {/* AI Panel - attached to card */}
            <div data-guide="review-ai" className="w-full max-w-lg mt-3">
              {aiLoading ? (
                <div className="bg-gray-900 border border-purple-500/30 rounded-lg p-3">
                  <p className="text-purple-400 text-sm animate-pulse">{t("analyzing")}</p>
                </div>
              ) : aiResults[index] ? (
                <div
                  className="bg-gray-900 border border-purple-500/30 rounded-lg p-3 max-h-28 overflow-y-auto touch-auto cursor-pointer active:opacity-70 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); speak(aiResults[index], card.language); }}
                >
                  <div className="flex items-start gap-2">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed flex-1">{aiResults[index]}</pre>
                    <div className="flex items-center gap-1 shrink-0">
                      {aiSaved[index] ? (
                        <span className="text-xs text-green-400">✓</span>
                      ) : (
                        <button
                          title={locale === "ko" ? "AI 예문을 노트에 저장합니다" : "Save AI example to notes"}
                          onClick={(e) => { e.stopPropagation(); handleSaveAiResult(); }}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors text-sm"
                        >
                          +
                        </button>
                      )}
                      {typeof navigator !== "undefined" && navigator.share && (
                        <button
                          title={locale === "ko" ? "예문을 다른 앱으로 공유합니다" : "Share example to other apps"}
                          onClick={(e) => { e.stopPropagation(); navigator.share({ text: aiResults[index] }).catch(() => {}); }}
                          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : plan !== "pro" && aiRemaining <= 0 ? (
                <div className="flex gap-2">
                  <a href="/pricing" className="flex-1 py-2 text-center bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs hover:bg-indigo-600/30 transition-colors">
                    {t("upgradeForUnlimited")}
                  </a>
                  <button
                    onClick={async () => {
                      alert(locale === "ko" ? "준비중입니다" : "Coming soon");
                      if (user) {
                        const { resetAiUsage } = await import("@/lib/aiUsage");
                        await resetAiUsage(user.id);
                        setAiRemaining(DAILY_LIMIT);
                      }
                    }}
                    disabled
                    className="flex-1 py-2 bg-gray-800/50 text-gray-600 border border-gray-700/30 rounded-lg text-xs cursor-not-allowed"
                  >
                    {locale === "ko" ? "광고 보기 (준비중)" : "Watch Ad (Coming soon)"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAi}
                  className="w-full py-2.5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-600/30 transition-colors"
                >
                  AI Example
                  {plan !== "pro" && (
                    <span className="ml-1 text-xs text-purple-400/60">
                      · {!user ? (locale === "ko" ? `무료 체험 ${aiRemaining}/${GUEST_LIMIT}` : `Free trial ${aiRemaining}/${GUEST_LIMIT}`) : (locale === "ko" ? `일일 무료 ${aiRemaining}/${DAILY_LIMIT}` : `Daily Free ${aiRemaining}/${DAILY_LIMIT}`)}
                    </span>
                  )}
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Empty card placeholder — visible to guide overlay */}
            <div data-guide="review-card" className="w-full max-w-lg" style={{ height: "min(50vh, 350px)" }}>
              <div className="w-full h-full bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center">
                <p className="text-gray-500 text-sm">{t("noCards")}</p>
              </div>
            </div>
            <div data-guide="review-ai" className="w-full max-w-lg mt-3">
              <button
                disabled
                className="w-full py-2.5 bg-purple-600/10 text-purple-400/40 border border-purple-500/20 rounded-lg text-sm cursor-not-allowed"
              >
                AI Example
              </button>
            </div>
          </>
        )}
      </div>

      {/* Bottom Progress */}
      <div className="px-4 pb-6 pt-3">
        <div className="text-center text-xs text-gray-500 mb-1.5">
          {cards.length > 0 ? `${index + 1} / ${cards.length}` : "0 / 0"}
        </div>
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
