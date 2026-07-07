"use client";

import { useEffect, useState, useRef } from "react";
import { supabase, NuanceChat, NuanceResult } from "@/lib/supabase";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useTts } from "@/lib/useTts";
import { useLocale } from "@/lib/useLocale";
import { getAiUsage, incrementAiUsage, DAILY_LIMIT } from "@/lib/aiUsage";

type Message = {
  role: "user" | "ai";
  text?: string;
  results?: NuanceResult[];
};

const LANGS_OPTIONS = ["English", "Japanese"] as const;
const TONE_OPTIONS = [
  { value: "Casual", label: "Casual" },
  { value: "Polite", label: "Polite" },
  { value: "Formal", label: "Formal" },
] as const;

function NuanceContent() {
  const { user, plan } = useAuth();
  const { speak } = useTts();
  const { t, locale } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [targetLangs, setTargetLangs] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["English"];
    const saved = localStorage.getItem("nuance_target_langs");
    return saved ? JSON.parse(saved) : ["English"];
  });
  const [tone, setTone] = useState(() => {
    if (typeof window === "undefined") return "Polite";
    return localStorage.getItem("nuance_tone") || "Polite";
  });
  const [dateTabs, setDateTabs] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("new");
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [aiRemaining, setAiRemaining] = useState<number>(DAILY_LIMIT);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const didScroll = useRef(false);

  const todayStr = new Date().toISOString().split("T")[0];

  // Load AI usage for free users
  useEffect(() => {
    if (!user || plan === "pro") return;
    getAiUsage(user.id).then(({ remaining }) => setAiRemaining(remaining));
  }, [user, plan]);

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
          msgs.push({ role: "user", text: chat.input_text });
          msgs.push({ role: "ai", results: chat.results });
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
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
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

  function toggleLang(lang: string) {
    setTargetLangs((prev) => {
      if (prev.includes(lang)) {
        if (prev.length === 1) return prev;
        const next = prev.filter((l) => l !== lang);
        localStorage.setItem("nuance_target_langs", JSON.stringify(next));
        return next;
      }
      const next = [...prev, lang];
      localStorage.setItem("nuance_target_langs", JSON.stringify(next));
      return next;
    });
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

    // Check AI usage limit for free users
    if (plan !== "pro" && user) {
      const { remaining } = await getAiUsage(user.id);
      if (remaining <= 0) {
        alert(t("aiLimitReached"));
        return;
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

        // Increment AI usage for free users
        if (plan !== "pro" && user) {
          await incrementAiUsage(user.id);
          const { remaining } = await getAiUsage(user.id);
          setAiRemaining(remaining);
        }

        await supabase.from("nuance_chats").insert({
          user_id: user?.id,
          input_text: trimmed,
          results,
          target_langs: targetLangs,
          tone,
        });

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

  async function handleAddToNotes(result: NuanceResult, inputText: string) {
    if (!user) return;
    const key = `${result.language}-${result.translation}`;
    setSavingNote(key);

    const lang = result.language === "Japanese" ? "japanese" : "english";

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
        ? existing.sentence_grammar + "\n" + result.translation
        : result.translation;
      await supabase
        .from("study_sessions")
        .update({ sentence_grammar: updated })
        .eq("id", existing.id);
    } else {
      await supabase.from("study_sessions").insert({
        user_id: user.id,
        language: lang,
        study_date: new Date().toISOString().split("T")[0],
        title: "Nuance",
        sentence_grammar: result.translation,
        raw_input: result.translation,
      });
    }

    setSavingNote(null);
    alert(t("addedToNotes"));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0a0a0a] overflow-hidden px-4 pt-4 pb-4" style={{ top: "calc(3.5rem + env(safe-area-inset-top))", paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom) + 1rem)", overscrollBehavior: "none" }}>

      {/* Date Tabs */}
      <div className="flex items-center gap-1 pb-2 mb-2">
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

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]">
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {msg.results?.map((result, idx) => (
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
                      <p className="text-lg font-medium text-gray-100 leading-relaxed flex-1">
                        {result.translation}
                      </p>
                      <button
                        onClick={() => speak(result.translation, result.language === "Japanese" ? "japanese" : "english")}
                        className="text-gray-500 hover:text-white transition-colors shrink-0 mt-1"
                      >
                        🔊
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
                          {result.alternatives.map((alt, altIdx) => (
                            <div key={altIdx} className="text-sm text-gray-400 bg-gray-800/30 rounded-md px-3 py-1.5">
                              {alt}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.language !== "Error" && (
                      <button
                        onClick={() => {
                          const userMsg = messages.slice(0, i).reverse().find((m) => m.role === "user");
                          handleAddToNotes(result, userMsg?.text || "");
                        }}
                        disabled={savingNote === `${result.language}-${result.translation}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        {savingNote === `${result.language}-${result.translation}` ? t("adding") : t("addToNotes")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <p className="text-sm text-purple-400 animate-pulse">{t("translating")}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Language & Tone + Input */}
      <div className="pt-3 border-t border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-1.5">
            {LANGS_OPTIONS.map((lang) => {
              const selected = targetLangs.includes(lang);
              return (
                <button
                  key={lang}
                  onClick={() => toggleLang(lang)}
                  className={`relative flex items-center justify-center w-9 h-9 rounded-lg text-base border transition-all ${
                    selected
                      ? "bg-indigo-500/20 border-indigo-500"
                      : "bg-gray-900 border-gray-700 hover:bg-gray-800"
                  }`}
                >
                  {lang === "English" ? "🇺🇸" : "🇯🇵"}
                  {selected && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 text-white rounded-full text-[9px] flex items-center justify-center">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5">
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
        </div>
        {plan !== "pro" && (
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs ${aiRemaining > 0 ? "text-gray-500" : "text-red-400"}`}>
              {aiRemaining > 0
                ? `${t("aiFree")}${aiRemaining}/${DAILY_LIMIT}${t("aiRemaining")}`
                : t("aiLimitReached")}
            </span>
            {aiRemaining <= 0 && (
              <a href="/pricing" className="text-xs text-indigo-400 hover:text-indigo-300">
                {t("upgradeForUnlimited")}
              </a>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => window.scrollTo(0, 0)}
            placeholder={t("enterSentence")}
            rows={1}
            disabled={plan !== "pro" && aiRemaining <= 0}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim() || (plan !== "pro" && aiRemaining <= 0)}
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
