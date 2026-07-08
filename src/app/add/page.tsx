"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { parseRawInput, extractMetadata } from "@/lib/parser";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/useLocale";
import GuideOverlay from "@/components/GuideOverlay";
import { getAiUsage, incrementAiUsage, DAILY_LIMIT } from "@/lib/aiUsage";

const SAMPLE_EN = `Stress and Pronunciation
apple- AE-pl

Vocabulary
brave (adjective) = not afraid of danger

--> She was brave enough to speak up

Sentence Structure & Grammar
I want to get better at English.

It depends on the situation.

Comment
Practice makes perfect.`;

function AddContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, plan } = useAuth();
  const { t } = useLocale();
  const initialLang = searchParams.get("lang") === "japanese" ? "japanese" : "english";
  const [language, setLanguage] = useState<"english" | "japanese">(initialLang);
  const [rawInput, setRawInput] = useState("");
  const [title, setTitle] = useState("");
  const [studyDate, setStudyDate] = useState(new Date().toISOString().split("T")[0]);
  const [preview, setPreview] = useState<ReturnType<typeof parseRawInput> | null>(null);
  const [saving, setSaving] = useState(false);
  const [showParseChoice, setShowParseChoice] = useState(false);
  const [aiRemaining, setAiRemaining] = useState<number>(DAILY_LIMIT);
  const isEngChannel = typeof window !== "undefined" && localStorage.getItem("eng-channel") === "true";

  useEffect(() => {
    if (!user || plan === "pro") return;
    getAiUsage(user.id).then(({ remaining }) => setAiRemaining(remaining));
  }, [user, plan]);

  function handlePreview() {
    const parsed = parseRawInput(rawInput);
    setPreview(parsed);
  }

  async function aiParse(raw: string, lang: "english" | "japanese"): Promise<string | null> {
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse", rawInput: raw, language: lang }),
      });
      const data = await res.json();
      return data.result || null;
    } catch {
      return null;
    }
  }

  function needsParseChoice(): boolean {
    if (language === "japanese") return true;
    if (!isEngChannel) return true;
    const parsed = parseRawInput(rawInput);
    return !(parsed.stress_pronunciation || parsed.vocabulary || parsed.sentence_grammar || parsed.comment);
  }

  function handleSaveClick() {
    if (!rawInput.trim()) return;
    if (needsParseChoice()) {
      setShowParseChoice(true);
    } else {
      doSave("none");
    }
  }

  async function doSave(mode: "ai" | "line" | "none") {
    setSaving(true);

    let insertData;
    if (mode === "none") {
      const parsed = parseRawInput(rawInput);
      insertData = {
        language,
        study_date: studyDate,
        title: title || null,
        stress_pronunciation: parsed.stress_pronunciation,
        vocabulary: parsed.vocabulary,
        sentence_grammar: parsed.sentence_grammar,
        comment: parsed.comment,
        raw_input: rawInput,
      };
    } else if (mode === "line") {
      const lines = rawInput
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      insertData = {
        language,
        study_date: studyDate,
        title: title || null,
        stress_pronunciation: null,
        vocabulary: null,
        sentence_grammar: lines.length > 0 ? lines.join("\n") : null,
        comment: rawInput.trim(),
        raw_input: rawInput,
      };
    } else {
      // AI mode — increment usage for free users
      if (plan !== "pro" && user) {
        await incrementAiUsage(user.id);
        const { remaining } = await getAiUsage(user.id);
        setAiRemaining(remaining);
      }
      const extracted = await aiParse(rawInput, language);
      const lines = (extracted || "")
        .split("\n")
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);
      insertData = {
        language,
        study_date: studyDate,
        title: title || null,
        stress_pronunciation: null,
        vocabulary: null,
        sentence_grammar: lines.length > 0 ? lines.join("\n") : null,
        comment: rawInput.trim(),
        raw_input: rawInput,
      };
    }

    const { error } = await supabase.from("study_sessions").insert({
      ...insertData,
      user_id: user?.id,
    });

    setSaving(false);

    if (error) {
      alert(t("saveFailed") + error.message);
    } else {
      router.push("/notes");
    }
  }

  return (
    <div className="space-y-6">
      <GuideOverlay pageKey="add" />
      {/* Title, Date & Language */}
      <div data-guide="add-header" className="flex gap-2 items-center">
        <input
          data-guide-tab="제목"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`${t("titleOptional")} | Lesson 12 - Business English`}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm h-[38px]"
        />
        <input
          data-guide-tab="날짜"
          type="date"
          value={studyDate}
          onChange={(e) => setStudyDate(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm shrink-0 h-[38px] appearance-none"
        />
        <div data-guide-tab="학습언어" className="flex gap-1 shrink-0">
          <button
            onClick={() => setLanguage("english")}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              language === "english"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            🇺🇸
          </button>
          <button
            onClick={() => setLanguage("japanese")}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              language === "japanese"
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            🇯🇵
          </button>
        </div>
      </div>

      {/* Raw Input */}
      <div data-guide="add-textarea">
        <textarea
          value={rawInput}
          onChange={(e) => {
            const val = e.target.value;
            setRawInput(val);
            setPreview(null);

            // Auto-fill date and title from metadata (English Channel only)
            if (language === "english" && isEngChannel) {
              const meta = extractMetadata(val);
              if (meta.date) setStudyDate(meta.date);
              if (meta.teacher || meta.lesson) {
                const parts = [meta.lesson, meta.teacher].filter(Boolean);
                setTitle(parts.join(" - "));
              }
            }
          }}
          placeholder={language === "english" && isEngChannel ? t("pasteFormatEN") : t("pasteContent")}
          rows={16}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm font-mono leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {language === "english" && isEngChannel && (
          <button
            onClick={handlePreview}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            {t("previewBtn")}
          </button>
        )}
        <button
          data-guide="add-actions"
          onClick={handleSaveClick}
          disabled={saving || !rawInput.trim()}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>

      {/* Parse Choice Modal */}
      {showParseChoice && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold">{t("parseChoice")}</h3>
            <p className="text-sm text-gray-400">{t("noFormatDetected")}</p>
            <div className="space-y-2">
              {plan === "pro" ? (
                <button
                  onClick={() => { setShowParseChoice(false); doSave("ai"); }}
                  className="w-full py-3 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-600/30 transition-colors"
                >
                  <span className="flex items-center justify-center gap-2">
                    {t("aiExtract")}
                    <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded">Pro</span>
                  </span>
                  <span className="block text-xs text-gray-500 mt-1">{t("aiExtractDesc")}</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => router.push("/pricing")}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {t("aiExtract")}
                      <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">Pro</span>
                    </span>
                    <span className="block text-xs text-indigo-200 mt-1">{t("subscribe")}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (aiRemaining <= 0) return;
                      setShowParseChoice(false);
                      doSave("ai");
                    }}
                    disabled={aiRemaining <= 0}
                    className="w-full py-3 bg-purple-600/10 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-600/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {t("aiFreeExtract")}
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                        {aiRemaining}/{DAILY_LIMIT}
                      </span>
                    </span>
                    <span className="block text-xs text-gray-500 mt-1">{t("aiExtractDesc")}</span>
                  </button>
                </>
              )}
              <button
                onClick={() => { setShowParseChoice(false); doSave("line"); }}
                className="w-full py-3 bg-gray-800 text-gray-300 border border-gray-700 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                {t("lineByLine")}
                <span className="block text-xs text-gray-500 mt-1">{t("lineByLineDesc")}</span>
              </button>
            </div>
            <button
              onClick={() => setShowParseChoice(false)}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          <div className="bg-gray-900 px-4 py-2 border-b border-gray-800">
            <span className="text-sm font-medium text-gray-300">{t("previewResult")}</span>
          </div>
          <div className="p-4 space-y-4">
            {preview.stress_pronunciation && (
              <Section title="Stress & Pronunciation" content={preview.stress_pronunciation} color="purple" />
            )}
            {preview.vocabulary && (
              <Section title="Vocabulary" content={preview.vocabulary} color="green" />
            )}
            {preview.sentence_grammar && (
              <Section title="Sentence Structure & Grammar" content={preview.sentence_grammar} color="blue" />
            )}
            {preview.comment && (
              <Section title="Comment" content={preview.comment} color="yellow" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddPage() {
  return (
    <RequireAuth>
      <AddContent />
    </RequireAuth>
  );
}

function Section({ title, content, color }: { title: string; content: string; color: string }) {
  const colorMap: Record<string, string> = {
    purple: "border-purple-500/30 text-purple-400",
    green: "border-green-500/30 text-green-400",
    blue: "border-blue-500/30 text-blue-400",
    yellow: "border-yellow-500/30 text-yellow-400",
  };

  return (
    <div className={`border-l-2 pl-4 ${colorMap[color]}`}>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{content}</pre>
    </div>
  );
}
