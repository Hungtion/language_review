"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, NuanceChat, NuanceResult } from "@/lib/supabase";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useTts } from "@/lib/useTts";
import { useLocale } from "@/lib/useLocale";
import { getAiUsage, incrementAiUsage, DAILY_LIMIT } from "@/lib/aiUsage";
import { ensureUser } from "@/lib/guestAuth";
import GuideOverlay from "@/components/GuideOverlay";

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
  const { user, plan, isAnonymous } = useAuth();
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
  const [selectedDate, setSelectedDate] = useState<string>("new");
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [aiRemaining, setAiRemaining] = useState<number>(DAILY_LIMIT);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [swipedPair, setSwipedPair] = useState<number | null>(null);
  const swipeRef = useRef({ startX: 0, startY: 0, swiping: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const didScroll = useRef(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const GUEST_LIMIT = 5;

  // Load AI usage for free users + show banner
  useEffect(() => {
    if (!user || plan === "pro") return;
    if (isAnonymous) {
      // Anonymous: count total chats (not daily)
      supabase
        .from("nuance_chats")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .then(({ count }) => setAiRemaining(Math.max(0, GUEST_LIMIT - (count ?? 0))));
    } else {
      getAiUsage(user.id).then(({ remaining }) => setAiRemaining(remaining));
    }
  }, [user, plan, isAnonymous]);

  // Load available dates — current month: daily, past months: monthly
  useEffect(() => {
    if (!user) return;
    async function loadDates() {
      const { data } = await supabase
        .from("nuance_chats")
        .select("created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (data) {
        const currentMonth = todayStr.slice(0, 7); // "YYYY-MM"
        const allDates = [...new Set(data.map((d) => d.created_at.split("T")[0]))];
        const thisMonthDates = allDates.filter((d) => d.startsWith(currentMonth));
        const pastMonths = [...new Set(allDates.filter((d) => !d.startsWith(currentMonth)).map((d) => d.slice(0, 7)))];
        setDateTabs([...thisMonthDates, ...pastMonths]);
      }
      setSelectedDate("new");
    }
    loadDates();
  }, [user]);

  // Load messages for selected date or month
  useEffect(() => {
    if (!user) return;
    if (selectedDate === "new") {
      setMessages([]);
      setInitialLoading(false);
      return;
    }
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

      const { data } = await supabase
        .from("nuance_chats")
        .select("*")
        .eq("user_id", user!.id)
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
  }, [user, selectedDate, todayStr]);

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
    if (!user) {
      const guest = await ensureUser();
      if (!guest) { router.push("/login"); return; }
    }
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    if (targetLangs.length === 0) {
      alert(t("selectOneLang"));
      return;
    }

    // Check AI usage limit for free/anonymous users
    if (plan !== "pro") {
      const { data: { session: sess } } = await supabase.auth.getSession();
      const uid = sess?.user?.id || user?.id;
      if (uid && sess?.user?.is_anonymous) {
        const { count } = await supabase.from("nuance_chats").select("*", { count: "exact", head: true }).eq("user_id", uid);
        if ((count ?? 0) >= GUEST_LIMIT) { router.push("/login"); return; }
      } else if (uid) {
        const { remaining } = await getAiUsage(uid);
        if (remaining <= 0) { alert(t("aiLimitReached")); return; }
      }
    }

    // Switch to new if on a past date
    if (selectedDate !== "today" && selectedDate !== "new") {
      setSelectedDate("new");
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

        // Update usage tracking for free users
        if (plan !== "pro") {
          const { data: { session: sess } } = await supabase.auth.getSession();
          const uid = sess?.user?.id || user?.id;
          if (uid && sess?.user?.is_anonymous) {
            // Anonymous: count total chats (will increase after insert below)
            const { count } = await supabase.from("nuance_chats").select("*", { count: "exact", head: true }).eq("user_id", uid);
            setAiRemaining(Math.max(0, GUEST_LIMIT - (count ?? 0) - 1));
          } else if (uid) {
            await incrementAiUsage(uid);
            const { remaining } = await getAiUsage(uid);
            setAiRemaining(remaining);
          }
        }

        const { data: { session: curSession } } = await supabase.auth.getSession();
        const uid = curSession?.user?.id || user?.id;
        const { data: inserted } = await supabase.from("nuance_chats").insert({
          user_id: uid,
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

        // Add today to date tabs if not there
        if (!dateTabs.includes(todayStr)) {
          setDateTabs((prev) => [todayStr, ...prev]);
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
    <div data-guide="nuance-screen" className="fixed inset-0 flex flex-col bg-[#0a0a0a] overflow-hidden px-4 pt-3 pb-4" style={{ top: "calc(3.5rem + env(safe-area-inset-top))", paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom) + 1rem)", overscrollBehavior: "none" }}>
      <GuideOverlay pageKey="nuance" />

      {/* Tone & Language */}
      <div className="flex items-center justify-between pb-3">
        <div data-guide="nuance-tone" className="flex gap-1.5">
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => changeTone(opt.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                tone === opt.value
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                  : "bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div data-guide="nuance-langs" className="flex gap-1 bg-gray-900 rounded-lg p-1 shrink-0">
          {LANGS_OPTIONS.map((lang) => (
            <button
              key={lang}
              onClick={() => selectLang(lang)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                targetLangs.includes(lang)
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-gray-200"
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
            <p className="text-gray-500 text-sm">{t("loadingChat")}</p>
          </div>
        )}

        {!initialLoading && messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">
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
                  <div className="flex justify-end mb-3">
                    <div
                      className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] cursor-pointer active:bg-indigo-500 transition-colors"
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
                            : "bg-gray-900 border border-gray-800"
                        }`}
                      >
                        {result.language !== "Error" && (
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-800">
                            <span className="text-sm">
                              {result.language === "English" ? "🇺🇸" : result.language === "Japanese" ? "🇯🇵" : "🌐"}
                            </span>
                            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                              {result.language}
                            </span>
                          </div>
                        )}

                        <div className="flex items-start gap-2 mb-3">
                          <div
                            className="flex-1 cursor-pointer active:opacity-70 transition-opacity"
                            onClick={() => speak(result.translation, result.language === "Japanese" ? "japanese" : "english")}
                          >
                            <p className="text-lg font-medium text-gray-100 leading-relaxed">
                              {result.translation}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddToNotes(result.translation, result.language)}
                            disabled={savingNote === `${result.language}-${result.translation}` || savedKeys.has(`${result.language}-${result.translation}`)}
                            className={`shrink-0 mt-1 w-6 h-6 flex items-center justify-center rounded-full transition-colors text-sm ${
                              savedKeys.has(`${result.language}-${result.translation}`)
                                ? "text-green-400 border border-green-500/30 bg-green-600/20"
                                : "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 disabled:opacity-50"
                            }`}
                          >
                            {savedKeys.has(`${result.language}-${result.translation}`) ? "✓" : savingNote === `${result.language}-${result.translation}` ? "·" : "+"}
                          </button>
                        </div>

                        {result.nuance && (
                          <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-indigo-400 mb-1">{t("whyExpression")}</p>
                            <p className="text-sm text-gray-300 leading-relaxed">{result.nuance}</p>
                          </div>
                        )}

                        {result.alternatives?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-500 mb-1.5">{t("alternatives")}</p>
                            <div className="space-y-1">
                              {result.alternatives.map((alt, altIdx) => {
                                const altText = alt.replace(/\s*\([^)]*[가-힣][^)]*\)\s*$/, "").trim();
                                return (
                                  <div key={altIdx} className="flex items-center gap-1.5">
                                    <div
                                      className="flex-1 text-sm text-gray-400 bg-gray-800/30 rounded-md px-3 py-1.5 cursor-pointer active:opacity-70 transition-opacity"
                                      onClick={() => speak(altText, result.language === "Japanese" ? "japanese" : "english")}
                                    >
                                      {alt}
                                    </div>
                                    <button
                                      onClick={() => handleAddToNotes(altText, result.language)}
                                      disabled={savingNote === `${result.language}-${altText}` || savedKeys.has(`${result.language}-${altText}`)}
                                      className={`shrink-0 w-5 h-5 flex items-center justify-center rounded-full transition-colors text-xs ${
                                        savedKeys.has(`${result.language}-${altText}`)
                                          ? "text-green-400 border border-green-500/30 bg-green-600/20"
                                          : "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 disabled:opacity-50"
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
            <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <p className="text-sm text-purple-400 animate-pulse">{t("translating")}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Free usage + Date Tabs + Input */}
      {plan !== "pro" && (
        <p className="text-center text-xs text-gray-500 pt-2 pb-1">
          {(isAnonymous || !user) ? (locale === "ko" ? "무료 체험 " : "Free trial ") : t("aiFree")}<span className={aiRemaining > 0 ? "text-indigo-400" : "text-red-400"}>{aiRemaining}/{(isAnonymous || !user) ? GUEST_LIMIT : DAILY_LIMIT}</span>{t("aiRemaining")}
        </p>
      )}
      <div className="pt-3 border-t border-gray-800">
        <div className="flex items-center gap-1 mb-2">
          <div className="flex gap-1 overflow-x-auto flex-1 scrollbar-hide">
            <button
              onClick={() => setSelectedDate("today")}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedDate === "today"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
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
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {formatDateTab(date)}
                </button>
              ))}
          </div>
          <button
            onClick={() => {
              setMessages([]);
              setSelectedDate("new");
            }}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              selectedDate === "new"
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {t("newChat")}
          </button>
        </div>
        <div data-guide="nuance-input" className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (plan !== "pro" && aiRemaining <= 0) { inputRef.current?.blur(); router.push(isAnonymous ? "/login" : "/pricing"); } }}
            onBlur={() => window.scrollTo(0, 0)}
            placeholder={plan !== "pro" && aiRemaining <= 0 ? (locale === "ko" ? "무료 횟수를 모두 사용했어요" : "Free uses exhausted") : t("enterSentence")}
            rows={1}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <button
            onClick={() => { if (plan !== "pro" && aiRemaining <= 0) { router.push(isAnonymous ? "/login" : "/pricing"); return; } handleSend(); }}
            disabled={loading || (!input.trim() && !(plan !== "pro" && aiRemaining <= 0))}
            className="px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-sm font-medium transition-colors"
          >
            {t("send")}
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
