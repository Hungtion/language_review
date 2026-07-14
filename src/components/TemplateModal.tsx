"use client";

import { useState } from "react";
import { useLocale } from "@/lib/useLocale";
import templates from "@/data/templates.json";

type Template = {
  id: string;
  titleEn: string;
  titleKo: string;
  sub: string;
  descKo?: string;
  descEn?: string;
  language: string;
  vocabulary: string;
  sentence_grammar: string;
};

export default function TemplateModal({
  language,
  onClose,
  onAdd,
}: {
  language: "english" | "japanese";
  onClose: () => void;
  onAdd: (template: Template) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const [selected, setSelected] = useState<Template | null>(null);
  const [tab, setTab] = useState<"vocab" | "sentence">("vocab");

  const filtered = (templates as Template[]).filter((t) => t.language === language);

  if (selected) {
    const vocabLines = selected.vocabulary.split("\n").filter((l) => l.trim());
    const sentenceLines = selected.sentence_grammar.split("\n").filter((l) => l.trim());

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
        <div
          className="bg-bg-card border border-border-light rounded-xl w-full max-w-md max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text text-sm">
                &larr; {isKo ? "목록" : "Back"}
              </button>
              <button onClick={onClose} className="text-text-faint hover:text-text">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <h3 className="text-base font-bold text-text">
              {(isKo ? selected.descKo : selected.descEn) || (isKo ? selected.titleKo : selected.titleEn)}
              <span className="block text-xs text-text-faint font-normal mt-0.5">{selected.sub}</span>
            </h3>
            <p className="text-xs text-text-faint mt-1">
              {isKo
                ? `${vocabLines.length}${isKo ? "개 어휘" : " vocab"} / ${sentenceLines.length}${isKo ? "개 문장" : " sentences"}`
                : `${vocabLines.length} vocab / ${sentenceLines.length} sentences`}
            </p>

            {/* Tabs */}
            <div className="flex gap-1 bg-bg rounded-lg p-1 mt-3">
              <button
                onClick={() => setTab("vocab")}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  tab === "vocab" ? "bg-bg-hover text-text" : "text-text-muted"
                }`}
              >
                {isKo ? `어휘 (${vocabLines.length})` : `Vocab (${vocabLines.length})`}
              </button>
              <button
                onClick={() => setTab("sentence")}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  tab === "sentence" ? "bg-bg-hover text-text" : "text-text-muted"
                }`}
              >
                {isKo ? `문장 (${sentenceLines.length})` : `Sentences (${sentenceLines.length})`}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-3">
            <div className="space-y-1.5">
              {(tab === "vocab" ? vocabLines : sentenceLines).map((line, i) => (
                <div key={i} className="text-sm text-text-secondary py-1 border-b border-border/50 last:border-0">
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* Add Button */}
          <div className="px-5 py-4 border-t border-border">
            <button
              onClick={() => onAdd(selected)}
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-sm font-medium transition-colors"
            >
              {isKo ? "노트에 추가" : "Add to Notes"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-bg-card border border-border-light rounded-xl p-5 w-full max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-text">
            {isKo ? "난이도별 학습 템플릿" : "Study Templates by Level"}
          </h3>
          <button onClick={onClose} className="text-text-faint hover:text-text">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="space-y-2">
          {filtered.map((t) => {
            const desc = isKo ? t.descKo : t.descEn;
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="w-full text-left p-4 bg-bg-input border border-border rounded-xl hover:border-primary/50 transition-colors"
              >
                <span className="text-sm font-medium text-text">{desc || (isKo ? t.titleKo : t.titleEn)}</span>
                <span className="block text-xs text-text-faint mt-0.5">{t.sub}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
