"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { parseRawInput, extractMetadata } from "@/lib/parser";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/useLocale";
import GuideOverlay from "@/components/GuideOverlay";
import { getAiUsage, DAILY_LIMIT, GUEST_LIMIT, getGuestUsage, incrementGuestUsage, useAiCredit } from "@/lib/aiUsage";
import { getCredits } from "@/lib/credits";
import CreditModal from "@/components/CreditModal";

const AI_PARSE_CHAR_LIMIT = 5000;
import { addGuestNote } from "@/lib/guestStorage";
import { setUploadStatus } from "@/lib/uploadStatus";

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

const TEMPLATES = {
  english: [
    {
      label: { ko: "OPIc 스크립트", en: "OPIc Script" },
      text: `When it comes to learning English, I always try to practice speaking.\nI've been studying English for about 5 years now.\nEnsure that you practice every day to improve your fluency.\nThe thing is, consistency is more important than intensity.`,
    },
    {
      label: { ko: "비즈니스 이메일", en: "Business Email" },
      text: `I'm writing to follow up on our previous discussion.\nPlease find the attached document for your reference.\nI would appreciate it if you could get back to me by Friday.\nLooking forward to hearing from you soon.`,
    },
    {
      label: { ko: "일상 회화", en: "Daily Conversation" },
      text: `I've been grappling with this problem for hours.\nThe meeting was pushed back to next Friday.\nCould you walk me through the process?\nIt's not rocket science, just follow the steps.`,
    },
  ],
  japanese: [
    {
      label: { ko: "JLPT 독해", en: "JLPT Reading" },
      text: `環境問題は私たちの生活に深く関わっている。\n持続可能な社会を実現するためには、一人一人の努力が必要だ。\nこの問題について、様々な角度から考える必要がある。`,
    },
    {
      label: { ko: "일상 회화", en: "Daily Conversation" },
      text: `日本語を習うのは本当に面白いです。\n毎日少しずつ練習することが大切です。\nこの言葉の意味を教えていただけますか？\nだんだん上手になってきました。`,
    },
  ],
};

// Module-level: survives component remount (tab switch)
type UploadJob = {
  promise: Promise<{ language: string; studyDate: string; title: string; lines: string[]; userId: string } | null>;
  abort: AbortController;
  fileName: string;
};
let activeUpload: UploadJob | null = null;

function AddContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, plan } = useAuth();
  const { t, locale } = useLocale();
  const initialLang = searchParams.get("lang") === "japanese" ? "japanese"
    : (typeof window !== "undefined" && localStorage.getItem("lang-filter") as "english" | "japanese") || "english";
  const [language, setLanguage] = useState<"english" | "japanese">(initialLang);
  const [rawInput, setRawInput] = useState("");
  const [title, setTitle] = useState("");
  const [studyDate, setStudyDate] = useState(new Date().toISOString().split("T")[0]);
  const [preview, setPreview] = useState<ReturnType<typeof parseRawInput> | null>(null);
  const [saving, setSaving] = useState(false);
  const [showParseChoice, setShowParseChoice] = useState(false);
  const [aiRemaining, setAiRemaining] = useState<number>(DAILY_LIMIT);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [uploading, setUploading] = useState(!!activeUpload);
  const [uploadFileName, setUploadFileName] = useState(activeUpload?.fileName || "");
  const [uploadStep, setUploadStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEngChannel = typeof window !== "undefined" && localStorage.getItem("eng-channel") === "true";

  // On mount: if upload was running while away, attach to it
  useEffect(() => {
    if (!activeUpload) return;
    setUploading(true);
    setUploadFileName(activeUpload.fileName);
    activeUpload.promise.then((result) => {
      activeUpload = null;
      setUploading(false);
      setUploadFileName("");
      setUploadStatus(result ? "done" : "idle");
      if (result) router.push("/notes");
    });
  }, [router]);

  useEffect(() => {
    if (!user) {
      setAiRemaining(getGuestUsage().remaining);
      return;
    }
    getAiUsage(user.id).then(({ remaining }) => setAiRemaining(remaining));
    getCredits(user.id).then((c) => setUserCredits(c));
  }, [user]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!user) { router.push("/login"); return; }
    if (plan !== "pro") {
      const result = await useAiCredit(user.id);
      if (result === "none") { setShowCreditModal(true); return; }
      if (result === "credit") {
        const c = await getCredits(user.id);
        setUserCredits(c);
      }
      const { remaining } = await getAiUsage(user.id);
      setAiRemaining(remaining);
    }

    const abort = new AbortController();
    const currentLang = language;
    const currentDate = studyDate;
    const currentTitle = title;
    const userId = user!.id;

    const promise = (async (): Promise<{ language: string; studyDate: string; title: string; lines: string[]; userId: string } | null> => {
      try {
        // Step 1: Extract text from file
        setUploadStep(1);
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData, signal: abort.signal });
        const data = await res.json();
        if (data.debug) console.log("[upload debug]", data.debug);
        if (abort.signal.aborted) return null;
        if (!res.ok) { alert(data.error || "Upload failed"); return null; }

        const extracted = data.text as string;
        if (!extracted.trim()) { alert(locale === "ko" ? "파일에서 텍스트를 찾을 수 없습니다" : "No text found in file"); return null; }

        // Step 2: Parse
        setUploadStep(2);
        let lines: string[];
        if (extracted.length <= 5000) {
          const parseRes = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "parse-file", rawInput: extracted, language: currentLang }),
            signal: abort.signal,
          });
          const parseData = await parseRes.json();
          if (parseData.debug) console.log("[file-parse debug]", parseData.debug);
          if (abort.signal.aborted) return null;
          lines = (parseData.result || "").split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        } else {
          console.log("[file-parse] large file, using line split:", extracted.length, "chars");
          lines = extracted.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        }

        // Step 3: Save to DB
        setUploadStep(3);
        const { error } = await supabase.from("study_sessions").insert({
          language: currentLang,
          study_date: currentDate,
          title: currentTitle || file.name.replace(/\.[^.]+$/, ""),
          stress_pronunciation: null,
          vocabulary: null,
          sentence_grammar: lines.length > 0 ? lines.join("\n") : null,
          comment: null,
          raw_input: "",
          user_id: userId,
        });

        if (error) { alert(error.message); return null; }
        return { language: currentLang, studyDate: currentDate, title: currentTitle, lines, userId };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return null;
        return null;
      }
    })();

    activeUpload = { promise, abort, fileName: file.name };
    setUploading(true);
    setUploadFileName(file.name);
    setUploadStatus("uploading", file.name);

    const result = await promise;
    activeUpload = null;
    setUploading(false);
    setUploadFileName("");
    setUploadStatus(result ? "done" : "idle");
    if (result) router.push("/notes");
  }

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
      // AI mode — deduct usage
      if (!user) {
        const { remaining } = incrementGuestUsage();
        setAiRemaining(remaining);
      } else if (plan !== "pro") {
        const result = await useAiCredit(user.id);
        if (result === "none") { setShowCreditModal(true); setSaving(false); return; }
        const { remaining } = await getAiUsage(user.id);
        setAiRemaining(remaining);
        if (result === "credit") {
          const c = await getCredits(user.id);
          setUserCredits(c);
        }
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

    if (!user) {
      // Guest: save to localStorage
      addGuestNote(insertData as any);
      setSaving(false);
      router.push("/notes");
      return;
    }

    const { error } = await supabase.from("study_sessions").insert({
      ...insertData,
      user_id: user.id,
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
      {showCreditModal && <CreditModal onClose={() => setShowCreditModal(false)} />}
      {/* Title, Date & Language */}
      <div data-guide="add-header" className="flex gap-2 items-center">
        <div className="flex gap-2 flex-1 min-w-0">
          <input
            data-guide-tab="제목" data-guide-tab-en="Title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${t("titleOptional")} | Lesson 12 - Business English`}
            className="flex-1 min-w-0 bg-bg-input border border-border-light rounded-lg px-3 py-2 text-sm h-[38px]"
          />
          <input
            data-guide-tab="날짜" data-guide-tab-en="Date"
            type="date"
            value={studyDate}
            onChange={(e) => setStudyDate(e.target.value)}
            className="bg-bg-input border border-border-light rounded-lg px-2 py-2 text-sm shrink-0 h-[38px] appearance-none"
          />
        </div>
        <div data-guide-tab="언어" data-guide-tab-en="Language" className="flex gap-1 bg-bg-card rounded-lg p-1 shrink-0">
          {(["english", "japanese"] as const).map((f) => (
            <button
              key={f}
              title={f === "english" ? (locale === "ko" ? "영어 노트 작성" : "Write English note") : (locale === "ko" ? "일본어 노트 작성" : "Write Japanese note")}
              onClick={() => { setLanguage(f); localStorage.setItem("lang-filter", f); }}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                language === f
                  ? "bg-bg-hover text-text"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {f === "english" ? "🇺🇸" : "🇯🇵"}
            </button>
          ))}
        </div>
      </div>

      {/* Raw Input */}
      <div data-guide="add-textarea">
        <div className="flex gap-2 mb-2 flex-wrap items-center">
          <span className="text-xs text-text-faint">{locale === "ko" ? "예제:" : "Examples:"}</span>
          {TEMPLATES[language].map((tmpl, i) => (
            <button
              key={i}
              onClick={() => setRawInput(rawInput === tmpl.text ? "" : tmpl.text)}
              className={`text-xs border px-3 py-1.5 rounded-lg transition-colors ${
                rawInput === tmpl.text
                  ? "border-primary text-primary bg-primary/10"
                  : "text-text-faint border-border hover:border-primary/50 hover:text-primary"
              }`}
            >
              {locale === "ko" ? tmpl.label.ko : tmpl.label.en}
            </button>
          ))}
        </div>
        <div className="relative">
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
            className="w-full bg-bg-card border border-border rounded-xl p-4 text-sm font-mono leading-relaxed focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y"
          />
          {uploading && (
            <div className="absolute inset-0 bg-bg-card/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-4 px-6">
              <svg className="w-10 h-10 text-primary animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
              <div className="w-full max-w-[240px] space-y-2">
                {[
                  locale === "ko" ? "파일 읽는 중..." : "Reading file...",
                  locale === "ko" ? "AI 분석 중..." : "AI analyzing...",
                  locale === "ko" ? "저장 중..." : "Saving...",
                ].map((label, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs transition-colors ${
                    uploadStep === i + 1 ? "text-primary" : uploadStep > i + 1 ? "text-primary" : "text-text-faint"
                  }`}>
                    <span className="w-4 text-center">
                      {uploadStep > i + 1 ? "✓" : uploadStep === i + 1 ? "●" : "○"}
                    </span>
                    {label}
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-faint mt-2">
                {locale === "ko" ? "탭을 이동해도 안전합니다" : "Safe to switch tabs"}
              </p>
            </div>
          )}
        </div>
        <p className={`text-right text-xs mt-1 ${rawInput.length > AI_PARSE_CHAR_LIMIT ? "text-red-400" : "text-text-faint"}`}>
          {rawInput.length.toLocaleString()}/{AI_PARSE_CHAR_LIMIT.toLocaleString()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 items-center">
        {language === "english" && isEngChannel && (
          <button
            onClick={handlePreview}
            className="px-4 py-2 bg-bg-input hover:bg-bg-hover rounded-lg text-sm transition-colors"
          >
            {t("previewBtn")}
          </button>
        )}
        <button
          data-guide="add-actions"
          onClick={handleSaveClick}
          disabled={saving || !rawInput.trim()}
          className="px-6 py-2 bg-primary hover:bg-primary-hover disabled:bg-bg-hover disabled:text-text-faint rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? t("saving") : t("save")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.doc,.docx,.pdf,image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        {uploading ? (
          <button
            onClick={() => activeUpload?.abort.abort()}
            className="ml-auto px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <span className="animate-pulse">{uploadFileName || (locale === "ko" ? "처리중..." : "Processing...")}</span>
            </span>
          </button>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            title={locale === "ko" ? "파일에서 텍스트를 추출하고 AI로 파싱합니다" : "Extract text from file and AI-parse"}
            className="ml-auto px-3 py-2 bg-bg-input hover:bg-bg-hover rounded-lg text-sm transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
              🍃 {locale === "ko" ? "파일" : "File"}
              <span className="text-[10px] px-1 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">Beta</span>
            </span>
          </button>
        )}
      </div>

      {/* Parse Choice Modal */}
      {showParseChoice && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border-light rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold">{t("parseChoice")}</h3>
            <p className="text-sm text-text-muted">{t("noFormatDetected")}</p>
            <div className="space-y-3">
              {/* AI Extract option */}
              <button
                onClick={() => {
                  if (!user) { const { remaining } = getGuestUsage(); if (remaining <= 0) { router.push("/login"); return; } }
                  else if (plan !== "pro" && aiRemaining <= 0 && userCredits <= 0) { setShowCreditModal(true); setShowParseChoice(false); return; }
                  if (rawInput.length > AI_PARSE_CHAR_LIMIT) {
                    alert(locale === "ko" ? `AI 추출은 ${AI_PARSE_CHAR_LIMIT.toLocaleString()}자까지 가능합니다. (현재 ${rawInput.length.toLocaleString()}자)` : `AI extract is limited to ${AI_PARSE_CHAR_LIMIT.toLocaleString()} characters. (Current: ${rawInput.length.toLocaleString()})`);
                    return;
                  }
                  setShowParseChoice(false);
                  doSave("ai");
                }}
                className="w-full text-left p-4 bg-primary/10 border border-primary/30 rounded-xl hover:bg-primary/20 transition-colors"
              >
                <span className="flex items-center gap-2 text-primary font-medium text-sm">
                  🍃 {t("aiExtract")}
                  {plan !== "pro" && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded">
                      {!user
                        ? `${aiRemaining}/${GUEST_LIMIT}`
                        : aiRemaining > 0
                          ? `${aiRemaining}/${DAILY_LIMIT}`
                          : `🍃${userCredits}`}
                    </span>
                  )}
                </span>
                <span className="block text-xs text-text-faint mt-1">{t("aiExtractDesc")}</span>
                <div className="mt-3 bg-black/30 rounded-lg p-3 text-xs font-mono text-text-faint space-y-1">
                  <div className="text-primary/60">{locale === "ko" ? "▸ 핵심 문장만 카드로" : "▸ Key sentences as cards"}</div>
                  <div className="pl-2 text-text-faint">{locale === "ko" ? "카드 1: \"Practice makes perfect\"" : "Card 1: \"Practice makes perfect\""}</div>
                  <div className="pl-2 text-text-faint">{locale === "ko" ? "카드 2: \"brave = not afraid\"" : "Card 2: \"brave = not afraid\""}</div>
                </div>
              </button>

              {/* Line-by-line option */}
              <button
                onClick={() => { setShowParseChoice(false); doSave("line"); }}
                className="w-full text-left p-4 bg-bg-input border border-border-light rounded-xl hover:bg-bg-hover transition-colors"
              >
                <span className="text-text-secondary font-medium text-sm">{t("lineByLine")}</span>
                <span className="block text-xs text-text-faint mt-1">{t("lineByLineDesc")}</span>
                <div className="mt-3 bg-black/30 rounded-lg p-3 text-xs font-mono text-text-faint space-y-1">
                  <div className="text-text-muted/60">{locale === "ko" ? "▸ 각 줄 = 카드 1장" : "▸ Each line = 1 card"}</div>
                  <div className="pl-2 text-text-faint">{locale === "ko" ? "1줄 → 카드 1" : "Line 1 → Card 1"}</div>
                  <div className="pl-2 text-text-faint">{locale === "ko" ? "2줄 → 카드 2" : "Line 2 → Card 2"}</div>
                  <div className="pl-2 text-text-faint">{locale === "ko" ? "3줄 → 카드 3 ..." : "Line 3 → Card 3 ..."}</div>
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowParseChoice(false)}
              className="w-full py-2 text-sm text-text-faint hover:text-text-secondary transition-colors"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="bg-bg-card px-4 py-2 border-b border-border">
            <span className="text-sm font-medium text-text-secondary">{t("previewResult")}</span>
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
    purple: "border-primary/30 text-primary",
    green: "border-primary/30 text-primary",
    blue: "border-primary/30 text-primary",
    yellow: "border-primary/30 text-primary",
  };

  return (
    <div className={`border-l-2 pl-4 ${colorMap[color]}`}>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <pre className="text-text-secondary text-sm whitespace-pre-wrap font-sans">{content}</pre>
    </div>
  );
}
