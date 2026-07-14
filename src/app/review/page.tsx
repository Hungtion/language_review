"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, StudySession } from "@/lib/supabase";
import { parseVocabulary, parseSentences, parseSentencesWithBack } from "@/lib/parser";
import { getGuestNotes } from "@/lib/guestStorage";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useTts } from "@/lib/useTts";
import { useLocale } from "@/lib/useLocale";
import { getAiUsage, DAILY_LIMIT, GUEST_LIMIT, getGuestUsage, incrementGuestUsage, useAiCredit } from "@/lib/aiUsage";
import { getCredits } from "@/lib/credits";
import GuideOverlay from "@/components/GuideOverlay";
import CreditModal from "@/components/CreditModal";
import CelebrationModal from "@/components/CelebrationModal";
import PronunciationCheck, { type PronResult } from "@/components/PronunciationCheck";

type Card = {
  front: string;
  back: string;
  type: "vocab" | "sentence";
  sessionDate: string;
  language: "english" | "japanese";
  sessionId?: string;
  sourceField?: "stress_pronunciation" | "vocabulary" | "sentence_grammar";
  lineIndex?: number;
};

function ReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noteId = searchParams.get("noteId");
  const startIndexParam = searchParams.get("startIndex");
  const findCardParam = searchParams.get("findCard");
  const startIndexUsed = useRef(false);
  const findCardUsed = useRef(false);
  const { user, plan, refreshCredits } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndexRaw] = useState(0);
  const filterRef = useRef<string>("");
  const setIndex = useCallback((v: number | ((prev: number) => number)) => {
    setIndexRaw((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      if (filterRef.current) sessionStorage.setItem(`review-index-${filterRef.current}`, String(next));
      return next;
    });
  }, []);
  const [flipped, setFlipped] = useState(false);
  const [pronResult, setPronResult] = useState<PronResult | null>(null);
  const [filter, setFilter] = useState<"english" | "japanese">(() => {
    if (typeof window === "undefined") return "english";
    return (localStorage.getItem("lang-filter") as "english" | "japanese") || "english";
  });
  const [cardType, setCardType] = useState<"all" | "vocab" | "sentence">("all");
  const isEngChannel = typeof window !== "undefined" && localStorage.getItem("eng-channel") === "true";
  const [shuffled, setShuffled] = useState(false);
  const preShuffleCard = useRef<{ front: string; sessionId?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiResults, setAiResults] = useState<Record<number, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaved, setAiSaved] = useState<Record<number, boolean>>({});
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitPreview, setSplitPreview] = useState<string[] | null>(null);
  const [splitDeleteOrig, setSplitDeleteOrig] = useState(true);
  const [splitSelected, setSplitSelected] = useState<Set<number>>(new Set());
  const [splitDeleteConfirm, setSplitDeleteConfirm] = useState(false);
  const [splitDontAsk, setSplitDontAsk] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [splitAiConfirm, setSplitAiConfirm] = useState(false);
  const [splitNoResult, setSplitNoResult] = useState(false);
  const [aiRemaining, setAiRemaining] = useState<number>(DAILY_LIMIT);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [celebration, setCelebration] = useState<{ leafEarned: number; streakDays: number } | null>(null);
  const [userCredits, setUserCredits] = useState(0);
  const [autoplay, setAutoplay] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("tts-autoplay") === "true" : false
  );
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
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
  const mouseStartX = useRef(0);
  const mouseDragging = useRef(false);
  const mouseDown = useRef(false);
  const lastTouchEnd = useRef(0);
  const reviewedCards = useRef(new Set<number>());
  const lastRecordedAt = useRef(0);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  useEffect(() => {
    async function load() {
      let data;
      if (!user) {
        const all = getGuestNotes();
        data = noteId ? all.filter((n) => n.id === noteId) : all.filter((n) => n.language === filter);
      } else if (noteId) {
        const { data: dbData } = await supabase
          .from("study_sessions")
          .select("*")
          .eq("id", noteId)
          .eq("user_id", user.id);
        data = dbData;
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
          for (let si = 0; si < sents.length; si++) {
            built.push({
              front: sents[si],
              back: "",
              type: "vocab",
              sessionDate: date,
              language: lang,
              sessionId: session.id,
              sourceField: "stress_pronunciation",
              lineIndex: si,
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
              sessionId: session.id,
              sourceField: "vocabulary",
            });
          }
        }

        if (session.sentence_grammar) {
          const sents = parseSentencesWithBack(session.sentence_grammar);
          for (let si = 0; si < sents.length; si++) {
            built.push({
              front: sents[si].front,
              back: sents[si].back,
              type: "sentence",
              sessionDate: date,
              language: lang,
              sessionId: session.id,
              sourceField: "sentence_grammar",
              lineIndex: si,
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

      // When un-shuffling, restore position to the card user was viewing
      filterRef.current = filter;
      let startIndex = 0;
      if (findCardParam && !findCardUsed.current) {
        const idx = filtered.findIndex((c) => c.front.includes(findCardParam));
        startIndex = idx >= 0 ? idx : 0;
        findCardUsed.current = true;
      } else if (startIndexParam !== null && !startIndexUsed.current) {
        startIndex = parseInt(startIndexParam, 10) || 0;
        startIndexUsed.current = true;
      } else if (noteId) {
        startIndex = 0;
      } else if (!shuffled && preShuffleCard.current) {
        const ref = preShuffleCard.current;
        const found = filtered.findIndex((c) => c.front === ref.front && c.sessionId === ref.sessionId);
        startIndex = found >= 0 ? found : 0;
        preShuffleCard.current = null;
      } else {
        const saved = parseInt(sessionStorage.getItem(`review-index-${filter}`) || "0", 10) || 0;
        startIndex = saved < filtered.length ? saved : 0;
      }
      setIndex(startIndex);
      setFlipped(false);
      setPronResult(null);
      setAiResults({});
      setAiSaved({});
      setLoading(false);
    }
    load();
  }, [filter, cardType, shuffled, user, noteId]);

  const goNext = useCallback(() => {
    if (index < cards.length - 1) {
      stopTts();
      playingRef.current = false;
      setPlaying(false);
      reviewedCards.current.add(index);
      setIndex((i) => i + 1);
      setFlipped(false);
      setPronResult(null);
      // Record activity every 5 cards reviewed
      const size = reviewedCards.current.size;
      const milestone = Math.floor(size / 5) * 5;
      if (user && milestone >= 5 && milestone > lastRecordedAt.current) {
        lastRecordedAt.current = milestone;
        import("@/lib/streak").then(({ recordActivity }) => {
          recordActivity(user.id, "card_review", 5).then((res) => {
            refreshCredits();
            if (res.milestone) {
              setCelebration({ leafEarned: res.leafEarned, streakDays: res.milestone });
            } else if (res.leafEarned > 0) {
              import("@/components/Toast").then(({ toast }) => {
                toast(`🍃 +${res.leafEarned} Leaf`, "success");
              });
            }
          });
        });
      }
    }
  }, [index, cards.length, user]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      stopTts();
      playingRef.current = false;
      setPlaying(false);
      setIndex((i) => i - 1);
      setFlipped(false);
      setPronResult(null);
    }
  }, [index]);

  function togglePlay() {
    if (playing) {
      playingRef.current = false;
      setPlaying(false);
      stopTts();
    } else {
      playingRef.current = true;
      setPlaying(true);
      if (cards[index]) {
        speak(cards[index].front, cards[index].language, () => {
          if (!playingRef.current) return;
          setTimeout(() => {
            if (!playingRef.current) return;
            setIndex((prev) => {
              if (prev < cards.length - 1) {
                return prev + 1;
              } else {
                playingRef.current = false;
                setPlaying(false);
                return prev;
              }
            });
            setFlipped(false);
          }, 800);
        });
      }
    }
  }

  useEffect(() => {
    if (!cards[index] || loading) return;
    if (playing && playingRef.current) {
      speak(cards[index].front, cards[index].language, () => {
        if (!playingRef.current) return;
        setTimeout(() => {
          if (!playingRef.current) return;
          setIndex((prev) => {
            if (prev < cards.length - 1) {
              return prev + 1;
            } else {
              playingRef.current = false;
              setPlaying(false);
              return prev;
            }
          });
          setFlipped(false);
        }, 800);
      });
    } else if (autoplay && !playing) {
      speak(cards[index].front, cards[index].language);
    }
  }, [index, loading]);

  // Load AI usage and credits
  useEffect(() => {
    if (!user) {
      setAiRemaining(getGuestUsage().remaining);
      return;
    }
    getAiUsage(user.id).then(({ remaining }) => setAiRemaining(remaining));
    getCredits(user.id).then((c) => setUserCredits(c));
  }, [user]);

  async function handleAi() {
    if (aiLoading || aiResults[index]) return;

    // Check AI usage limit
    if (!user) {
      const { remaining } = getGuestUsage();
      if (remaining <= 0) { router.push("/login"); return; }
    } else if (plan !== "pro") {
      const result = await useAiCredit(user.id);
      if (result === "none") { setShowCreditModal(true); return; }
      const { remaining } = await getAiUsage(user.id);
      setAiRemaining(remaining);
      if (result === "credit") {
        const c = await getCredits(user.id);
        setUserCredits(c);
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

      // Guest usage tracking
      if (!user && data.result) {
        const { remaining } = incrementGuestUsage();
        setAiRemaining(remaining);
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

    // Find existing "LAB Examples" note for same language
    const { data: existing } = await supabase
      .from("study_sessions")
      .select("id, sentence_grammar")
      .eq("user_id", user.id)
      .eq("title", "LAB Examples")
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
        title: "LAB Examples",
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

  async function handleDeleteCard() {
    const card = cards[index];
    if (!card || !card.sessionId || !card.sourceField) return;

    const { data: session } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("id", card.sessionId)
      .single();
    if (!session) return;

    const fieldValue = (session as Record<string, unknown>)[card.sourceField] as string;
    if (!fieldValue) return;

    const lines = parseSentences(fieldValue);
    const lineIdx = card.lineIndex ?? lines.findIndex((l) => l === card.front);
    if (lineIdx === -1) return;

    const newLines = lines.filter((_, i) => i !== lineIdx);
    const newValue = newLines.length > 0 ? newLines.join("\n") : null;

    const { error } = await supabase
      .from("study_sessions")
      .update({ [card.sourceField]: newValue })
      .eq("id", card.sessionId);

    if (error) { alert(error.message); return; }

    const newCards = cards.filter((_, i) => i !== index);
    setCards(newCards);
    if (index >= newCards.length && newCards.length > 0) setIndex(newCards.length - 1);
    setFlipped(false);
  }

  function hasMultipleSentences(text: string) {
    const matches = text.match(/[.!?。！？]\s/g);
    const endsWithPunct = /[.!?。！？]$/.test(text.trim());
    const count = (matches?.length || 0) + (endsWithPunct ? 1 : 0);
    return count >= 2;
  }

  async function handleSplit() {
    const card = cards[index];
    if (!card || !card.sessionId || !card.sourceField || splitLoading) return;

    // Check AI usage limit
    if (!user) {
      const { remaining } = getGuestUsage();
      if (remaining <= 0) { router.push("/login"); return; }
    } else if (plan !== "pro") {
      const { remaining } = await getAiUsage(user.id);
      if (remaining <= 0 && userCredits <= 0) { setShowCreditModal(true); return; }
    }

    setSplitLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "split-sentence", text: card.front }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else if (data.result && data.result.length > 1) {
        // Deduct credit
        if (!user) {
          const { remaining } = incrementGuestUsage();
          setAiRemaining(remaining);
        } else if (plan !== "pro") {
          const result = await useAiCredit(user.id);
          if (result === "credit") {
            const c = await getCredits(user.id);
            setUserCredits(c);
          }
          const { remaining } = await getAiUsage(user.id);
          setAiRemaining(remaining);
        }
        setSplitPreview(data.result);
        setSplitSelected(new Set(data.result.map((_: string, i: number) => i)));
      } else {
        setSplitNoResult(true);
      }
    } catch {
      alert(locale === "ko" ? "요청 실패" : "Request failed");
    }
    setSplitLoading(false);
  }

  async function doSplitConfirm(sentences: string[], deleteOrig: boolean) {
    const card = cards[index];
    if (!card || !card.sessionId || !card.sourceField) return;

    const { data: session } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("id", card.sessionId)
      .single();
    if (!session) { alert("Session not found"); return; }

    const fieldValue = (session as Record<string, unknown>)[card.sourceField] as string;
    const lines = parseSentences(fieldValue);
    const lineIdx = card.lineIndex ?? lines.findIndex((l) => l === card.front);
    if (lineIdx === -1) { alert("Line not found"); return; }

    const newLines = deleteOrig
      ? [...lines.slice(0, lineIdx), ...sentences, ...lines.slice(lineIdx + 1)]
      : [...lines.slice(0, lineIdx + 1), ...sentences, ...lines.slice(lineIdx + 1)];
    const newValue = newLines.join("\n");

    const { error } = await supabase
      .from("study_sessions")
      .update({ [card.sourceField]: newValue })
      .eq("id", card.sessionId);

    if (error) { alert("저장 실패: " + error.message); return; }

    const newCards = [...cards];
    const splitCards: Card[] = sentences.map((s, i) => ({
      front: s,
      back: "",
      type: card.type,
      sessionDate: card.sessionDate,
      language: card.language,
      sessionId: card.sessionId,
      sourceField: card.sourceField,
      lineIndex: lineIdx + (deleteOrig ? i : i + 1),
    }));
    if (deleteOrig) {
      newCards.splice(index, 1, ...splitCards);
    } else {
      newCards.splice(index + 1, 0, ...splitCards);
    }
    setCards(newCards);
    setSplitPreview(null);
  }

  async function handleSplitConfirm() {
    if (!splitPreview) return;
    const selected = splitPreview.filter((_, i) => splitSelected.has(i));
    if (selected.length === 0) { setSplitPreview(null); return; }
    await doSplitConfirm(selected, true);
  }

  async function doSplitKeep() {
    if (!splitPreview) return;
    const selected = splitPreview.filter((_, i) => splitSelected.has(i));
    if (selected.length === 0) { setSplitPreview(null); return; }
    await doSplitConfirm(selected, false);
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      stopTts();
    };
  }, []);

  useEffect(() => {
    let animating = false;
    function handleKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const c = cards[index];
        if (c?.back) {
          if (!flipped) { speak(c.front, c.language); setFlipped(true); }
        } else if (c) { speak(c.front, c.language); }
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (animating || index >= cards.length - 1) return;
        animating = true;
        setSwipeAnim("left");
        setTimeout(() => {
          goNext();
          setSwipeAnim(null);
          setEnterAnim("from-right");
          setTimeout(() => { setEnterAnim("entering"); setTimeout(() => { setEnterAnim(null); animating = false; }, 200); }, 20);
        }, 200);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        if (animating || index <= 0) return;
        animating = true;
        setSwipeAnim("right");
        setTimeout(() => {
          goPrev();
          setSwipeAnim(null);
          setEnterAnim("from-left");
          setTimeout(() => { setEnterAnim("entering"); setTimeout(() => { setEnterAnim(null); animating = false; }, 200); }, 20);
        }, 200);
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
    const inToolbar = (e.target as HTMLElement).closest(".card-toolbar");
    setPressed(!inToolbar);
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
    lastTouchEnd.current = Date.now();
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
    // Quick tap (not a real swipe) → TTS + flip
    if ((e.target as HTMLElement).closest(".card-toolbar")) return;
    if (Math.abs(dx) <= 50) {
      // Stop auto-play on card tap
      if (playingRef.current) {
        playingRef.current = false;
        setPlaying(false);
      }
      const c = cards[index];
      if (!c) return;
      if (c.back) {
        if (!flipped) {
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
    return (
      <div className="fixed inset-0 flex flex-col bg-bg items-center justify-center" style={{ top: "calc(3.5rem + env(safe-area-inset-top))", paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}>
        <div className="w-full max-w-lg px-4 space-y-4">
          <div className="flex gap-2">
            <div className="h-8 w-16 bg-bg-hover/60 rounded-lg animate-pulse" />
            <div className="h-8 w-16 bg-bg-hover/60 rounded-lg animate-pulse" />
            <div className="h-8 w-16 bg-bg-hover/60 rounded-lg animate-pulse" />
          </div>
          <div className="bg-bg-hover/60 rounded-2xl animate-pulse" style={{ height: "min(50vh, 350px)" }} />
          <div className="h-10 bg-bg-hover/60 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const card = cards.length > 0 ? cards[index] : null;

  return (
    <div className="fixed inset-0 flex flex-col bg-bg overflow-hidden touch-none sm:pb-0" style={{ top: "calc(3.5rem + env(safe-area-inset-top))", paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom))", overscrollBehavior: "none" }}>
      <GuideOverlay pageKey="review" />
      {showCreditModal && <CreditModal onClose={() => setShowCreditModal(false)} />}
      {celebration && (
        <CelebrationModal
          type="streak"
          leafEarned={celebration.leafEarned}
          streakDays={celebration.streakDays}
          onClose={() => setCelebration(null)}
        />
      )}
      {noteId && (
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <span className="text-xs text-primary">
            {locale === "ko" ? "이 노트의 카드만 보는 중" : "Viewing cards from this note only"}
          </span>
          <button
            onClick={() => router.push("/review")}
            className="text-xs text-text-faint hover:text-text-secondary transition-colors"
          >
            {locale === "ko" ? "전체 카드 보기" : "Show all cards"}
          </button>
        </div>
      )}
      {/* Filters */}
      <div className="flex items-center justify-between px-4 pt-3 pb-3">
        <div data-guide="review-filters-right" className="flex gap-4 items-center shrink-0">
          <button
            title={locale === "ko" ? "카드를 넘기면 자동으로 발음이 재생됩니다" : "Automatically plays pronunciation when flipping cards"}
            data-guide-tab={`자동\n재생`} data-guide-tab-en={`Auto\nPlay`}
            onClick={() => {
              const next = !autoplay;
              setAutoplay(next);
              localStorage.setItem("tts-autoplay", String(next));
            }}
            className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${
              autoplay ? "bg-primary" : "bg-bg-hover"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform flex items-center justify-center text-[9px] font-bold ${
                autoplay ? "translate-x-4 bg-white text-primary" : "translate-x-0 bg-gray-500 text-text-secondary"
              }`}
            >
              A
            </span>
          </button>

          <button
            title={locale === "ko" ? "카드 순서를 무작위로 섞습니다" : "Shuffle card order randomly"}
            data-guide-tab="셔플" data-guide-tab-en="Shuffle"
            onClick={() => {
              if (!shuffled && cards[index]) {
                preShuffleCard.current = { front: cards[index].front, sessionId: cards[index].sessionId };
              }
              sessionStorage.removeItem("review-index");
              setShuffled((s) => !s);
            }}
            className={`px-3 py-1 rounded-lg text-base transition-colors shrink-0 ${
              shuffled
                ? "bg-primary text-primary-text"
                : "bg-bg-card text-text-muted hover:text-text"
            }`}
          >
            🔀
          </button>

          <button
            title={locale === "ko" ? "연속 재생" : "Auto play all"}
            data-guide-tab="자동 넘김" data-guide-tab-en="Auto Play"
            onClick={togglePlay}
            className={`px-3 py-1 rounded-lg text-base transition-colors shrink-0 ${
              playing
                ? "bg-primary text-primary-text"
                : "bg-bg-card text-text-muted hover:text-text"
            }`}
          >
            {playing ? "⏸" : "▶️"}
          </button>
        </div>

        <div className="flex gap-2 items-center overflow-x-auto scrollbar-hide flex-nowrap">
          {isEngChannel && (
            <>
              <div data-guide="review-filter-type" className="flex gap-1 bg-bg-card rounded-lg p-1 shrink-0">
                {(["all", "vocab", "sentence"] as const).map((ct) => (
                  <button
                    key={ct}
                    onClick={() => { sessionStorage.removeItem("review-index"); setCardType(ct); }}
                    className={`px-3 py-1 rounded-md text-sm transition-colors ${
                      cardType === ct
                        ? "bg-bg-hover text-text"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    {ct === "all" ? t("all") : ct === "vocab" ? t("vocab") : t("sentence")}
                  </button>
                ))}
              </div>

              <div className="w-px h-5 bg-bg-hover shrink-0" />
            </>
          )}

          <div data-guide="review-filter-lang" className="flex gap-1 bg-bg-card rounded-lg p-1 shrink-0">
            {(["english", "japanese"] as const).map((f) => (
              <button
                key={f}
                title={f === "english" ? (locale === "ko" ? "영어 카드 보기" : "Show English cards") : (locale === "ko" ? "일본어 카드 보기" : "Show Japanese cards")}
                onClick={() => { sessionStorage.removeItem("review-index"); setFilter(f); localStorage.setItem("lang-filter", f); }}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  filter === f
                    ? "bg-bg-hover text-text"
                    : "text-text-muted hover:text-text"
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
            <div className="relative w-full max-w-lg">
            {index > 0 && (
              <div className="hidden sm:flex absolute -left-10 top-1/2 -translate-y-1/2 text-text-faint/30 pointer-events-none">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </div>
            )}
            {index < cards.length - 1 && (
              <div className="hidden sm:flex absolute -right-10 top-1/2 -translate-y-1/2 text-text-faint/30 pointer-events-none">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            )}
            <div
              data-guide="review-card"
              className={`card-flip select-none w-full max-w-lg ${card.back ? "cursor-pointer" : ""} ${swipeAnim || enterAnim === "entering" ? "transition-transform duration-200" : swipeX || enterAnim ? "" : "transition-transform duration-150"}`}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={() => {
                if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
                longPressTriggered.current = false;
                swiping.current = false;
                setPressed(false);
                setSwipeX(0);
              }}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                if (Date.now() - lastTouchEnd.current < 500) return;
                if ((e.target as HTMLElement).closest(".card-toolbar")) return;
                mouseStartX.current = e.clientX;
                mouseDown.current = true;
                mouseDragging.current = false;
                setPressed(true);
              }}
              onMouseMove={(e) => {
                if (!mouseDown.current) return;
                const dx = e.clientX - mouseStartX.current;
                if (Math.abs(dx) > 10) mouseDragging.current = true;
                if (mouseDragging.current) setSwipeX(dx);
              }}
              onMouseUp={(e) => {
                if (!mouseDown.current) return;
                mouseDown.current = false;
                setPressed(false);
                const dx = e.clientX - mouseStartX.current;
                if (mouseDragging.current && Math.abs(dx) > 50) {
                  const dir = dx < 0 ? "left" : "right";
                  if ((dir === "left" && index >= cards.length - 1) || (dir === "right" && index <= 0)) {
                    setSwipeX(0);
                    mouseDragging.current = false;
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
                  mouseDragging.current = false;
                  return;
                }
                setSwipeX(0);
                // click (no drag) → flip
                if ((e.target as HTMLElement).closest(".card-toolbar")) return;
                const c = cards[index];
                if (!c) return;
                if (c.back) {
                  if (!flipped) { speak(c.front, c.language); setFlipped(true); }
                } else {
                  speak(c.front, c.language);
                }
              }}
              onMouseLeave={() => {
                if (mouseDown.current) {
                  mouseDown.current = false;
                  mouseDragging.current = false;
                  setPressed(false);
                  setSwipeX(0);
                }
              }}
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
              <div className="relative w-full h-full">
                <div className="absolute inset-0 bg-bg-card border border-border rounded-2xl p-8 flex flex-col items-center justify-center">
                  {/* Top dead zone — prevents flip on top border tap */}
                  <div className="card-toolbar absolute top-0 left-0 right-0 h-14 z-[5] flex items-center justify-center">
                    {pronResult && (
                      <span className={`text-lg font-bold ${pronResult.score >= 80 ? "text-green-500" : pronResult.score >= 50 ? "text-yellow-500" : "text-red-400"}`}>
                        {pronResult.score}% <span className="text-xs font-normal">{pronResult.score >= 90 ? (isKo ? "완벽해요!" : "Perfect!") : pronResult.score >= 70 ? (isKo ? "잘했어요!" : "Great!") : pronResult.score >= 50 ? (isKo ? "괜찮아요" : "Good try") : (isKo ? "다시 해볼까요?" : "Try again")}</span>
                      </span>
                    )}
                  </div>
                  {/* Card toolbar: share, split, delete */}
                  <div className="card-toolbar absolute top-3 right-3 flex items-center gap-2 z-10">
                    {typeof navigator !== "undefined" && navigator.share && (
                      <button
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.share({ text: card.front }).catch(() => {});
                        }}
                        title={locale === "ko" ? "공유" : "Share"}
                        className="text-text-faint hover:text-text-secondary transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                      </button>
                    )}
                    {card.sessionId && hasMultipleSentences(card.front) && (
                      <button
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); plan !== "pro" ? setSplitAiConfirm(true) : handleSplit(); }}
                        disabled={splitLoading}
                        title={locale === "ko" ? "카드 나누기" : "Split sentences"}
                        className="text-text-faint hover:text-orange-400 transition-colors disabled:opacity-50"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="8" x2="12" y2="11"/><line x1="12" y1="14" x2="12" y2="19"/><line x1="12" y1="22" x2="12" y2="23"/></svg>
                      </button>
                    )}
                    {card.sessionId && (
                      <button
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(true); }}
                        title={locale === "ko" ? "카드 삭제" : "Delete card"}
                        className="p-2 -m-1 text-text-faint hover:text-red-400 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        card.language === "english"
                          ? "bg-primary/20 text-primary"
                          : "bg-primary/20 text-primary"
                      }`}
                    >
                      {card.language === "english" ? "EN" : "JP"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        card.type === "vocab"
                          ? "bg-primary/20 text-primary"
                          : "bg-primary/20 text-primary"
                      }`}
                    >
                      {card.type === "vocab" ? t("vocab") : t("sentence")}
                    </span>
                    <span className="text-xs text-text-faint">{card.sessionDate}</span>
                  </div>
                  <p className="text-xl text-center font-medium leading-relaxed">
                    {pronResult ? (
                      pronResult.matches.map((m, i) => (
                        <span
                          key={i}
                          className={`transition-colors ${
                            m.matched ? "text-green-500" : "text-red-400"
                          }`}
                        >
                          {m.word}{i < pronResult.matches.length - 1 ? " " : ""}
                        </span>
                      ))
                    ) : (
                      card.front
                    )}
                  </p>
                  {pronResult && pronResult.transcript && (
                    <div className="mt-2 text-center">
                      <span className="text-[10px] text-text-faint">{isKo ? "내 발음" : "My speech"}</span>
                      <p className="text-sm text-red-400 italic">{pronResult.transcript}</p>
                    </div>
                  )}
                  {/* Back content revealed below front */}
                  {flipped && card.back && (
                    <div className="mt-4 pt-4 border-t border-border w-full">
                      <pre className="text-base text-center whitespace-pre-wrap font-sans leading-relaxed text-primary">
                        {card.back}
                      </pre>
                    </div>
                  )}
                  <div
                    className="card-toolbar absolute bottom-3 left-0 right-0 flex justify-center"
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <PronunciationCheck targetText={card.front} language={card.language} onResult={setPronResult} />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Panel - attached to card */}
            <div data-guide="review-ai" className="w-full max-w-lg mt-3">
              {aiLoading ? (
                <div className="bg-bg-card border border-primary/30 rounded-lg p-3 text-center">
                  <p className="text-primary text-sm animate-pulse">{t("analyzing")}</p>
                </div>
              ) : aiResults[index] ? (
                <div
                  className="bg-bg-card border border-primary/30 rounded-lg p-3 max-h-28 overflow-y-auto touch-auto cursor-pointer active:opacity-70 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); speak(aiResults[index], card.language); }}
                >
                  <div className="flex items-start gap-2">
                    <pre className="text-sm text-text-secondary whitespace-pre-wrap font-sans leading-relaxed flex-1">{aiResults[index]}</pre>
                    <div className="flex items-center gap-1 shrink-0">
                      {aiSaved[index] ? (
                        <span className="text-xs text-primary">✓</span>
                      ) : (
                        <button
                          title={locale === "ko" ? "LAB 예문을 노트에 저장합니다" : "Save LAB example to notes"}
                          onClick={(e) => { e.stopPropagation(); handleSaveAiResult(); }}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors text-sm"
                        >
                          +
                        </button>
                      )}
                      {typeof navigator !== "undefined" && navigator.share && (
                        <button
                          title={locale === "ko" ? "예문을 다른 앱으로 공유합니다" : "Share example to other apps"}
                          onClick={(e) => { e.stopPropagation(); navigator.share({ text: aiResults[index] }).catch(() => {}); }}
                          className="w-6 h-6 flex items-center justify-center text-text-faint hover:text-text-secondary transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleAi}
                  className="w-full py-2.5 bg-primary/20 text-primary border border-primary/30 rounded-lg text-sm hover:bg-primary/30 transition-colors"
                >
                  🍃 LAB Example
                  <span className="block text-[10px] text-text-faint font-normal mt-0.5">
                    {locale === "ko"
                      ? `일일 무료 ${aiRemaining}/${DAILY_LIMIT}회 남음${aiRemaining <= 0 ? " (내 Leaf 차감)" : ""}`
                      : `Free ${aiRemaining}/${DAILY_LIMIT} remaining${aiRemaining <= 0 ? " (Leaf deducted)" : ""}`}
                  </span>
                </button>
              )}

            </div>
            </div>

            {/* Split Preview Modal */}
            {(splitLoading || splitPreview) && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => { if (!splitLoading) setSplitPreview(null); }}>
                <div className="bg-bg-card border border-border-light rounded-xl w-full max-w-md max-h-[70vh] overflow-y-auto p-5 space-y-4 touch-auto" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold text-center">
                    {locale === "ko" ? "카드 나누기 미리보기" : "Split Preview"}
                  </h3>
                  <div className="bg-bg-input/50 rounded-lg p-3 text-sm text-text-muted">
                    <span className="text-xs text-text-faint block mb-1">{locale === "ko" ? "원본" : "Original"}</span>
                    {cards[index]?.front}
                  </div>
                  {splitLoading ? (
                    <p className="text-center text-orange-400 text-sm animate-pulse">
                      {locale === "ko" ? "분석 중..." : "Analyzing..."}
                    </p>
                  ) : splitPreview ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-faint">
                          {splitSelected.size}/{splitPreview.length} {locale === "ko" ? "선택" : "selected"}
                        </span>
                        <button
                          onClick={() => setSplitSelected(splitSelected.size === splitPreview.length ? new Set() : new Set(splitPreview.map((_, i) => i)))}
                          className="text-xs text-primary hover:text-primary transition-colors"
                        >
                          {splitSelected.size === splitPreview.length
                            ? (locale === "ko" ? "전체 해제" : "Deselect all")
                            : (locale === "ko" ? "전체 선택" : "Select all")}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {splitPreview.map((s, i) => (
                          <div
                            key={i}
                            onClick={() => setSplitSelected((prev) => { const next = new Set(prev); if (next.has(i)) next.delete(i); else next.add(i); return next; })}
                            className={`rounded-lg p-3 text-sm cursor-pointer transition-colors ${
                              splitSelected.has(i)
                                ? "bg-primary/20 border border-primary/40 text-text"
                                : "bg-bg-input/30 text-text-faint"
                            }`}
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm text-text-muted">{locale === "ko" ? "나눈 카드로 대체" : "Replace with split cards"}</span>
                        <button
                          onClick={() => setSplitDeleteOrig((v) => !v)}
                          className={`w-10 h-5 rounded-full transition-colors relative ${splitDeleteOrig ? "bg-orange-500" : "bg-bg-hover"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${splitDeleteOrig ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setSplitPreview(null)}
                          className="flex-1 py-2.5 bg-bg-input text-text-muted rounded-lg text-sm hover:bg-bg-hover transition-colors"
                        >
                          {locale === "ko" ? "취소" : "Cancel"}
                        </button>
                        <button
                          onClick={() => {
                            if (splitSelected.size === 0) return;
                            if (splitDeleteOrig && !localStorage.getItem("split-auto")) {
                              setSplitDeleteConfirm(true);
                            } else if (splitDeleteOrig) {
                              handleSplitConfirm();
                            } else {
                              doSplitKeep();
                            }
                          }}
                          disabled={splitSelected.size === 0}
                          className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-500 transition-colors disabled:opacity-40"
                        >
                          {locale === "ko" ? "나누기" : "Split"}
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* Split Delete Confirm Popup */}
            {splitDeleteConfirm && (
              <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setSplitDeleteConfirm(false)}>
                <div className="bg-bg-card border border-border-light rounded-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm text-text-secondary text-center">
                    {locale === "ko" ? "기존 카드는 삭제되고 나뉘어진 카드로 대체됩니다" : "The original card will be deleted and replaced with split cards"}
                  </p>
                  <label className="flex items-center justify-center gap-2 text-xs text-text-faint cursor-pointer">
                    <input
                      type="checkbox"
                      checked={splitDontAsk}
                      onChange={(e) => setSplitDontAsk(e.target.checked)}
                      className="w-3.5 h-3.5 accent-gray-500 rounded"
                    />
                    {locale === "ko" ? "다시 보지 않기" : "Don't show again"}
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSplitDeleteConfirm(false)}
                      className="flex-1 py-2 bg-bg-input text-text-muted rounded-lg text-sm hover:bg-bg-hover transition-colors"
                    >
                      {locale === "ko" ? "취소" : "Cancel"}
                    </button>
                    <button
                      onClick={() => {
                        if (splitDontAsk) localStorage.setItem("split-auto", "delete");
                        setSplitDeleteConfirm(false);
                        handleSplitConfirm();
                      }}
                      className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-500 transition-colors"
                    >
                      {locale === "ko" ? "확인" : "OK"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Split No Result Modal */}
            {splitNoResult && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSplitNoResult(false)}>
                <div className="bg-bg-card border border-border-light rounded-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm text-text-muted text-center">
                    {locale === "ko" ? "나눌 문장이 없습니다" : "No sentences to split"}
                  </p>
                  <button
                    onClick={() => setSplitNoResult(false)}
                    className="w-full py-2.5 bg-bg-input text-text-secondary rounded-lg text-sm hover:bg-bg-hover transition-colors"
                  >
                    {locale === "ko" ? "확인" : "OK"}
                  </button>
                </div>
              </div>
            )}

            {/* Split AI Confirm Modal */}
            {splitAiConfirm && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSplitAiConfirm(false)}>
                <div className="bg-bg-card border border-border-light rounded-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold text-center">
                    {locale === "ko" ? "카드 나누기" : "Split Sentences"}
                  </h3>
                  <p className="text-sm text-text-muted text-center">
                    {locale === "ko"
                      ? "LAB 카드 나누기 기능입니다."
                      : "LAB split sentences feature."}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSplitAiConfirm(false)}
                      className="flex-1 py-2.5 bg-bg-input text-text-muted rounded-lg text-sm hover:bg-bg-hover transition-colors"
                    >
                      {locale === "ko" ? "취소" : "Cancel"}
                    </button>
                    <button
                      onClick={() => { setSplitAiConfirm(false); handleSplit(); }}
                      className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-500 transition-colors"
                    >
                      {locale === "ko" ? "🍃 카드 나누기" : "🍃 Split"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteConfirm && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(false)}>
                <div className="bg-bg-card border border-border-light rounded-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold text-center">
                    {locale === "ko" ? "카드 삭제" : "Delete Card"}
                  </h3>
                  <p className="text-sm text-text-muted text-center">
                    {locale === "ko" ? "이 카드를 삭제하시겠습니까?" : "Delete this card?"}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="flex-1 py-2.5 bg-bg-input text-text-muted rounded-lg text-sm hover:bg-bg-hover transition-colors"
                    >
                      {locale === "ko" ? "취소" : "Cancel"}
                    </button>
                    <button
                      onClick={() => { setDeleteConfirm(false); handleDeleteCard(); }}
                      className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500 transition-colors"
                    >
                      {locale === "ko" ? "삭제" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full max-w-lg flex flex-col items-center justify-center gap-4 py-8">
            <div data-guide="review-card" className="w-full" style={{ height: "min(40vh, 280px)" }}>
              <div className="w-full h-full bg-bg-card border border-border rounded-2xl flex flex-col items-center justify-center gap-4 p-6">
                <div className="text-4xl">🃏</div>
                <h3 className="text-base font-bold text-text text-center">
                  {locale === "ko" ? "복습할 카드가 없습니다" : "No cards to review yet"}
                </h3>
                <p className="text-xs text-text-muted text-center">
                  {locale === "ko"
                    ? "노트를 추가하면 복습 카드가 자동으로 만들어집니다."
                    : "Add notes and flashcards will be created automatically."}
                </p>
                <a
                  href="/add"
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-sm font-medium transition-colors"
                >
                  {locale === "ko" ? "새 표현 추가" : "Add Expression"}
                </a>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Bottom Progress */}
      <div className="px-4 pb-6 pt-3">
        <div className="text-center text-xs text-text-faint mb-1.5">
          {cards.length > 0 ? `${index + 1} / ${cards.length}` : "0 / 0"}
        </div>
        <div
          className="h-2 bg-bg-input rounded-full overflow-hidden cursor-pointer relative touch-none"
          onClick={(e) => {
            if (cards.length === 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const newIdx = Math.min(Math.round(ratio * (cards.length - 1)), cards.length - 1);
            stopTts();
            setIndex(newIdx);
            setFlipped(false);
          }}
          onTouchStart={(e) => {
            if (cards.length === 0) return;
            const touch = e.touches[0];
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
            const newIdx = Math.min(Math.round(ratio * (cards.length - 1)), cards.length - 1);
            stopTts();
            setIndex(newIdx);
            setFlipped(false);
          }}
          onTouchMove={(e) => {
            if (cards.length === 0) return;
            const touch = e.touches[0];
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
            const newIdx = Math.min(Math.round(ratio * (cards.length - 1)), cards.length - 1);
            setIndex(newIdx);
            setFlipped(false);
          }}
        >
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
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
