"use client";

import { useEffect, useState, useRef } from "react";
import { supabase, NuanceChat, NuanceResult } from "@/lib/supabase";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";

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
  const { user } = useAuth();
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
  const [selectedDate, setSelectedDate] = useState<string>("today");
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const didScroll = useRef(false);

  const todayStr = new Date().toISOString().split("T")[0];

  // Load available dates
  useEffect(() => {
    if (!user) return;
    async function loadDates() {
      const { data } = await supabase
        .from("nuance_chats")
        .select("created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (data) {
        const dates = [...new Set(data.map((d) => d.created_at.split("T")[0]))];
        setDateTabs(dates);
      }
      setSelectedDate("today");
    }
    loadDates();
  }, [user]);

  // Load messages for selected date
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
      const startOfDay = `${dateFilter}T00:00:00.000Z`;
      const endOfDay = `${dateFilter}T23:59:59.999Z`;

      const { data } = await supabase
        .from("nuance_chats")
        .select("*")
        .eq("user_id", user!.id)
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
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

  function changeTone(t: string) {
    setTone(t);
    localStorage.setItem("nuance_tone", t);
  }

  function formatDateTab(dateStr: string): string {
    if (dateStr === "today") return "오늘";
    const d = new Date(dateStr + "T00:00:00");
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}/${day}`;
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    if (targetLangs.length === 0) {
      alert("최소 한 개 이상의 언어를 선택해주세요!");
      return;
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
          { role: "ai", results: [{ language: "Error", translation: data.error || "오류 발생", nuance: "", alternatives: [] }] },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", results: [{ language: "Error", translation: "요청에 실패했습니다.", nuance: "", alternatives: [] }] },
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
    const altsText = result.alternatives.length > 0
      ? "\n\n대안 표현:\n" + result.alternatives.join("\n")
      : "";

    await supabase.from("study_sessions").insert({
      user_id: user.id,
      language: lang,
      study_date: new Date().toISOString().split("T")[0],
      title: `Nuance: ${inputText.slice(0, 30)}`,
      sentence_grammar: result.translation,
      comment: `원문: ${inputText}\n\n뉘앙스: ${result.nuance}${altsText}`,
      raw_input: inputText,
    });

    setSavingNote(null);
    alert("복습 노트에 추가되었습니다!");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-1.5rem-5rem)] overflow-hidden">

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
            오늘
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
          + 새 대화
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-3">
        {initialLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">대화 불러오는 중...</p>
          </div>
        )}

        {!initialLoading && messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">
              어떤 이야기를 하고 싶나요?
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

                    <p className="text-lg font-medium text-gray-100 leading-relaxed mb-3">
                      {result.translation}
                    </p>

                    {result.nuance && (
                      <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                        <p className="text-xs font-medium text-indigo-400 mb-1">왜 이 표현일까요?</p>
                        <p className="text-sm text-gray-300 leading-relaxed">{result.nuance}</p>
                      </div>
                    )}

                    {result.alternatives?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">다른 표현</p>
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
                        {savingNote === `${result.language}-${result.translation}` ? "추가 중..." : "+ 복습 노트에 추가"}
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
              <p className="text-sm text-purple-400 animate-pulse">번역 중...</p>
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
            {TONE_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => changeTone(t.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  tone === t.value
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                    : "bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="궁금한 문장을 입력하세요."
            rows={1}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-sm font-medium transition-colors"
          >
            전송
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
