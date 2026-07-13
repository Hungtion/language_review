"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, NuanceChat, NuanceResult } from "@/lib/supabase";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useTts } from "@/lib/useTts";
import { useLocale } from "@/lib/useLocale";
import { getAiUsage, DAILY_LIMIT, GUEST_LIMIT, getGuestUsage, incrementGuestUsage, useAiCredit } from "@/lib/aiUsage";
import { getCredits } from "@/lib/credits";
import GuideOverlay from "@/components/GuideOverlay";
import CreditModal from "@/components/CreditModal";

type Message = {
  role: "user" | "ai";
  text?: string;
  results?: NuanceResult[];
  chatId?: string;
};

const LANGS_OPTIONS = ["English", "Japanese"] as const;
const TONE_OPTIONS = [
  { value: "Casual", label: "Casual" },
  { value: "Polite", label: "Polite" },
  { value: "Formal", label: "Formal" },
] as const;

function NuanceContent() {
  const { user, plan, refreshCredits } = useAuth();
  const router = useRouter();
  const { speak } = useTts();
  const { t, locale } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [targetLangs, setTargetLangs] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["English"];
    const saved = localStorage.getItem("lang-filter");
    return saved === "japanese" ? ["Japanese"] : ["English"];
  });
  const [tone, setTone] = useState(() => {
    if (typeof window === "undefined") return "Polite";
    return localStorage.getItem("nuance_tone") || "Polite";
  });
  const [dateTabs, setDateTabs] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("today");
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [aiRemaining, setAiRemaining] = useState<number>(DAILY_LIMIT);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [swipedPair, setSwipedPair] = useState<number | null>(null);
  const swipeRef = useRef({ startX: 0, startY: 0, swiping: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const didScroll = useRef(false);
  const sendingRef = useRef(false);

  const todayStr = new Date().toISOString().split("T")[0];

  // Load AI usage and credits
  useEffect(() => {
    if (!user) {
      setAiRemaining(getGuestUsage().remaining);
      return;
    }
    getAiUsage(user.id).then(({ remaining }) => setAiRemaining(remaining));
    getCredits(user.id).then((c) => setUserCredits(c));
  }, [user]);

  // Load available dates — current month: daily, past months: monthly
  useEffect(() => {
    if (!user) return;
    async function loadDates() {
      const langKey = targetLangs[0] || "English";
      const { data } = await supabase
        .from("nuance_chats")
        .select("created_at")
        .eq("user_id", user!.id)
        .contains("target_langs", [langKey])
        .order("created_at", { ascending: false });

      if (data) {
        const currentMonth = todayStr.slice(0, 7); // "YYYY-MM"
        const allDates = [...new Set(data.map((d) => d.created_at.split("T")[0]))];
        const thisMonthDates = allDates.filter((d) => d.startsWith(currentMonth));
        const pastMonths = [...new Set(allDates.filter((d) => !d.startsWith(currentMonth)).map((d) => d.slice(0, 7)))];
        setDateTabs([...thisMonthDates, ...pastMonths]);
      }
      setSelectedDate("today");
    }
    loadDates();
  }, [user, targetLangs]);

  // Load messages for selected date or month
  useEffect(() => {
    if (!user) return;
    if (sendingRef.current) return;
    async function loadMessages() {
      setInitialLoading(true);
      didScroll.current = false;

      const dateFilter = selectedDate === "today" ? todayStr : selectedDate;
      const isMonth = /^\d{4}-\d{2}$/.test(dateFilter);

      let startRange: string;
      let endRange: string;
      if (isMonth) {
        // Monthly: load entire month
        const [year, month] = dateFilter.split("-").map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        startRange = `${dateFilter}-01T00:00:00.000Z`;
        endRange = `${dateFilter}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`;
      } else {
        startRange = `${dateFilter}T00:00:00.000Z`;
        endRange = `${dateFilter}T23:59:59.999Z`;
      }

      const langKey = targetLangs[0] || "English";
      const { data } = await supabase
        .from("nuance_chats")
        .select("*")
        .eq("user_id", user!.id)
        .contains("target_langs", [langKey])
        .gte("created_at", startRange)
        .lte("created_at", endRange)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        const msgs: Message[] = [];
        for (const chat of data) {
          msgs.push({ role: "user", text: chat.input_text, chatId: chat.id });
          msgs.push({ role: "ai", results: chat.results, chatId: chat.id });
        }
        setMessages(msgs);
      } else {
        setMessages([]);
      }
      setInitialLoading(false);
    }
    loadMessages();
  }, [user, selectedDate, todayStr, targetLangs]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Scroll to bottom
  useEffect(() => {
    if (!initialLoading && !didScroll.current) {
      messagesEndRef.current?.scrollIntoView();
      didScroll.current = true;
    }
  }, [initialLoading]);

  useEffect(() => {
    if (didScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function selectLang(lang: string) {
    setTargetLangs([lang]);
    localStorage.setItem("lang-filter", lang === "Japanese" ? "japanese" : "english");
  }

  function changeTone(val: string) {
    setTone(val);
    localStorage.setItem("nuance_tone", val);
  }

  function formatDateTab(dateStr: string): string {
    if (dateStr === "today") return t("today");
    // Monthly tab: "YYYY-MM" → "6월" or "Jun"
    if (/^\d{4}-\d{2}$/.test(dateStr)) {
      const month = parseInt(dateStr.split("-")[1], 10);
      return locale === "ko" ? `${month}월` : new Date(2000, month - 1).toLocaleString("en", { month: "short" });
    }
    // Daily tab: "YYYY-MM-DD" → "M/D"
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    if (targetLangs.length === 0) {
      alert(t("selectOneLang"));
      return;
    }

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

    // Switch to today if viewing a past date
    if (selectedDate !== "today") {
      sendingRef.current = true;
      setMessages([]);
      setSelectedDate("today");
    }

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "nuance",
          text: trimmed,
          targetLangs,
          tone,
        }),
      });
      const data = await res.json();

      if (data.result?.results) {
        const results: NuanceResult[] = data.result.results;
        setMessages((prev) => [...prev, { role: "ai", results }]);

        // Update guest usage tracking
        if (!user) {
          const { remaining } = incrementGuestUsage();
          setAiRemaining(remaining);
        }

        // Save to DB only for logged-in users
        if (user) {
          const { data: inserted } = await supabase.from("nuance_chats").insert({
            user_id: user.id,
            input_text: trimmed,
            results,
            target_langs: targetLangs,
            tone,
          }).select("id").single();

          if (inserted) {
            setMessages((prev) => prev.map((m, idx) => {
              if (idx >= prev.length - 2) return { ...m, chatId: inserted.id };
              return m;
            }));
          }

          if (!dateTabs.includes(todayStr)) {
            setDateTabs((prev) => [todayStr, ...prev]);
          }

          // Record activity for streak
          import("@/lib/streak").then(({ recordActivity }) => {
            recordActivity(user.id, "nuance_use").then(() => refreshCredits());
          });
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", results: [{ language: "Error", translation: data.error || t("errorOccurred"), nuance: "", alternatives: [] }] },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", results: [{ language: "Error", translation: t("requestFailed"), nuance: "", alternatives: [] }] },
      ]);
    }
    setLoading(false);
    sendingRef.current = false;
    inputRef.current?.focus();
  }

  async function handleAddToNotes(text: string, language: string) {
    if (!user) return;
    const key = `${language}-${text}`;
    setSavingNote(key);

    const lang = language === "Japanese" ? "japanese" : "english";

    // Find existing "Nuance" note for same language
    const { data: existing } = await supabase
      .from("study_sessions")
      .select("id, sentence_grammar")
      .eq("user_id", user.id)
      .eq("title", "Nuance")
      .eq("language", lang)
      .single();

    if (existing) {
      const updated = existing.sentence_grammar
        ? existing.sentence_grammar + "\n" + text
        : text;
      await supabase
        .from("study_sessions")
        .update({ sentence_grammar: updated, study_date: new Date().toISOString().split("T")[0] })
        .eq("id", existing.id);
    } else {
      await supabase.from("study_sessions").insert({
        user_id: user.id,
        language: lang,
        study_date: new Date().toISOString().split("T")[0],
        title: "Nuance",
        sentence_grammar: text,
        raw_input: text,
      });
    }

    setSavingNote(null);
    setSavedKeys((prev) => new Set(prev).add(key));
  }

  async function handleDeletePair(pairIdx: number) {
    const userMsg = messages[pairIdx * 2];
    if (userMsg?.chatId) {
      await supabase.from("nuance_chats").delete().eq("id", userMsg.chatId);
    }
    setMessages((prev) => prev.filter((_, i) => Math.floor(i / 2) !== pairIdx));
    setSwipedPair(null);
  }

  function pairTouchStart(e: React.TouchEvent, pairIdx: number) {
    swipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, swiping: false };
  }

  function pairTouchMove(e: React.TouchEvent, pairIdx: number) {
    const dx = e.touches[0].clientX - swipeRef.current.startX;
    const dy = Math.abs(e.touches[0].clientY - swipeRef.current.startY);
    if (Math.abs(dx) > 10 && Math.abs(dx) > dy) {
      swipeRef.current.swiping = true;
    }
  }

  function pairTouchEnd(e: React.TouchEvent, pairIdx: number) {
    if (!swipeRef.current.swiping) return;
    const dx = e.changedTouches[0].clientX - swipeRef.current.startX;
    if (dx < -60) {
      setSwipedPair(pairIdx);
    } else {
      setSwipedPair(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div data-guide="nuance-screen" className="fixed inset-0 flex flex-col bg-bg overflow-hidden px-4 pt-3 pb-4" style={{ top: "calc(3.5rem + env(safe-area-inset-top))", paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom) + 1rem)", overscrollBehavior: "none" }}>
      <GuideOverlay pageKey="nuance" />
      {showCreditModal && <CreditModal onClose={() => setShowCreditModal(false)} />}

      {/* Tone & Language */}
      <div className="flex items-center justify-between pb-3">
        <div data-guide="nuance-tone" className="flex gap-1.5">
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              title={locale === "ko" ? `${opt.label} 톤으로 변환합니다` : `Translate in ${opt.label} tone`}
              onClick={() => changeTone(opt.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                tone === opt.value
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-bg-card border-border-light text-text-muted hover:bg-bg-input"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div data-guide="nuance-langs" className="flex gap-1 bg-bg-card rounded-lg p-1 shrink-0">
          {LANGS_OPTIONS.map((lang) => (
            <button
              key={lang}
              title={lang === "English" ? (locale === "ko" ? "영어로 변환" : "Translate to English") : (locale === "ko" ? "일본어로 변환" : "Translate to Japanese")}
              onClick={() => selectLang(lang)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                targetLangs.includes(lang)
                  ? "bg-bg-hover text-text"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {lang === "English" ? "🇺🇸" : "🇯🇵"}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-3" style={{ WebkitOverflowScrolling: "touch" }}>
        {initialLoading && (
          <div className="text-center py-12">
            <p className="text-text-faint text-sm">{t("loadingChat")}</p>
          </div>
        )}

        {!initialLoading && messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-text-muted text-lg">
              {t("askAnything")}
            </p>
          </div>
        )}

        {Array.from({ length: Math.ceil(messages.length / 2) }, (_, pairIdx) => {
          const userMsg = messages[pairIdx * 2];
          const aiMsg = messages[pairIdx * 2 + 1];
          const isSwiped = swipedPair === pairIdx;

          return (
            <div key={pairIdx} className="relative overflow-hidden rounded-xl">
              {/* Delete button behind */}
              {isSwiped && (
                <div className="absolute inset-y-0 right-0 flex items-center z-10">
                  <button
                    onClick={() => handleDeletePair(pairIdx)}
                    className="h-full px-6 bg-red-600 text-white text-sm font-medium rounded-xl"
                  >
                    {locale === "ko" ? "삭제" : "Delete"}
                  </button>
                </div>
              )}

              {/* Swipeable content */}
              <div
                className={`relative z-20 transition-transform duration-200 ${isSwiped ? "-translate-x-20" : ""}`}
                onTouchStart={(e) => pairTouchStart(e, pairIdx)}
                onTouchMove={(e) => pairTouchMove(e, pairIdx)}
                onTouchEnd={(e) => pairTouchEnd(e, pairIdx)}
                onClick={() => { if (isSwiped) setSwipedPair(null); }}
              >
                {/* User message */}
                {userMsg && (
                  <div className="flex justify-end mb-3 group/msg">
                    <button
                      onClick={() => handleDeletePair(pairIdx)}
                      title={locale === "ko" ? "이 대화를 삭제합니다" : "Delete this conversation"}
                      className="hidden [@media(hover:hover)]:flex opacity-0 group-hover/msg:opacity-100 self-center mr-2 p-1.5 text-text-faint hover:text-red-400 transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                    <div
                      className="bg-primary text-primary-text rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] cursor-pointer active:bg-primary-hover transition-colors"
                      onClick={() => { if (!isSwiped && userMsg.text) { setInput(userMsg.text); inputRef.current?.focus(); } }}
                    >
                      <p className="text-sm leading-relaxed">{userMsg.text}</p>
                    </div>
                  </div>
                )}

                {/* AI message */}
                {aiMsg?.results && (
                  <div className="space-y-3">
                    {aiMsg.results.map((result, idx) => (
                      <div
                        key={idx}
                        className={`rounded-2xl rounded-tl-sm px-4 py-4 max-w-[95%] ${
                          result.language === "Error"
                            ? "bg-red-900/30 border border-red-500/30"
                            : "bg-bg-card border border-border"
                        }`}
                      >
                        {result.language !== "Error" && (
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
                            <span className="text-sm">
                              {result.language === "English" ? "🇺🇸" : result.language === "Japanese" ? "🇯🇵" : "🌐"}
                            </span>
                            <span className="text-xs font-medium text-primary uppercase tracking-wider">
                              {result.language}
                            </span>
                          </div>
                        )}

                        <div className="flex items-start gap-2 mb-3">
                          <div
                            className="flex-1 cursor-pointer active:opacity-70 transition-opacity"
                            onClick={() => speak(result.translation, result.language === "Japanese" ? "japanese" : "english")}
                          >
                            <p className="text-lg font-medium text-text leading-relaxed">
                              {result.translation}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddToNotes(result.translation, result.language)}
                            disabled={savingNote === `${result.language}-${result.translation}` || savedKeys.has(`${result.language}-${result.translation}`)}
                            className={`shrink-0 mt-1 w-6 h-6 flex items-center justify-center rounded-full transition-colors text-sm ${
                              savedKeys.has(`${result.language}-${result.translation}`)
                                ? "text-primary border border-primary/30 bg-primary/20"
                                : "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 disabled:opacity-50"
                            }`}
                          >
                            {savedKeys.has(`${result.language}-${result.translation}`) ? "✓" : savingNote === `${result.language}-${result.translation}` ? "·" : "+"}
                          </button>
                        </div>

                        {result.nuance && (
                          <div className="bg-bg-input/50 rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-primary mb-1">{t("whyExpression")}</p>
                            <p className="text-sm text-text-secondary leading-relaxed">{result.nuance}</p>
                          </div>
                        )}

                        {result.alternatives?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-text-faint mb-1.5">{t("alternatives")}</p>
                            <div className="space-y-1">
                              {result.alternatives.map((alt, altIdx) => {
                                const altText = alt.replace(/\s*\([^)]*[가-힣][^)]*\)\s*$/, "").trim();
                                return (
                                  <div key={altIdx} className="flex items-center gap-1.5">
                                    <div
                                      className="flex-1 text-sm text-text-muted bg-bg-input/30 rounded-md px-3 py-1.5 cursor-pointer active:opacity-70 transition-opacity"
                                      onClick={() => speak(altText, result.language === "Japanese" ? "japanese" : "english")}
                                    >
                                      {alt}
                                    </div>
                                    <button
                                      onClick={() => handleAddToNotes(altText, result.language)}
                                      disabled={savingNote === `${result.language}-${altText}` || savedKeys.has(`${result.language}-${altText}`)}
                                      className={`shrink-0 w-5 h-5 flex items-center justify-center rounded-full transition-colors text-xs ${
                                        savedKeys.has(`${result.language}-${altText}`)
                                          ? "text-primary border border-primary/30 bg-primary/20"
                                          : "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 disabled:opacity-50"
                                      }`}
                                    >
                                      {savedKeys.has(`${result.language}-${altText}`) ? "✓" : savingNote === `${result.language}-${altText}` ? "·" : "+"}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <p className="text-sm text-primary animate-pulse">{t("translating")}</p>
            </div>
          </div>
        )}

        {!initialLoading && plan !== "pro" && (
          <div className="text-center py-1">
            <span className="text-[10px] text-text-faint">
              {locale === "ko"
                ? `일일 무료 ${aiRemaining}/${DAILY_LIMIT}회 남음${aiRemaining <= 0 ? " (내 Leaf 차감)" : ""}`
                : `Free ${aiRemaining}/${DAILY_LIMIT} remaining${aiRemaining <= 0 ? " (Leaf deducted)" : ""}`}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Free usage + Date Tabs + Input */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center gap-1 mb-2">
          <div className="flex gap-1 overflow-x-auto flex-1 scrollbar-hide">
            <button
              onClick={() => setSelectedDate("today")}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedDate === "today"
                  ? "bg-primary text-primary-text"
                  : "bg-bg-input text-text-muted hover:bg-bg-hover"
              }`}
            >
              {t("today")}
            </button>
            {dateTabs
              .filter((d) => d !== todayStr)
              .map((date) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedDate === date
                      ? "bg-primary text-primary-text"
                      : "bg-bg-input text-text-muted hover:bg-bg-hover"
                  }`}
                >
                  {formatDateTab(date)}
                </button>
              ))}
          </div>
        </div>
        <div data-guide="nuance-input" className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (!user && aiRemaining <= 0) { inputRef.current?.blur(); router.push("/login"); } }}
            onBlur={() => window.scrollTo(0, 0)}
            placeholder={t("enterSentence")}
            rows={1}
            className="flex-1 bg-bg-card border border-border rounded-xl px-4 py-3 text-sm resize-none focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-4 bg-primary hover:bg-primary-hover disabled:bg-bg-hover disabled:text-text-faint rounded-xl text-sm font-medium transition-colors"
          >
            🍃 {t("send")}
          </button>
        </div>
      </div>

    </div>
  );
}

export default function NuancePage() {
  return (
    <RequireAuth>
      <NuanceContent />
    </RequireAuth>
  );
}
