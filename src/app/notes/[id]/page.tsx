"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, StudySession } from "@/lib/supabase";
import { parseVocabulary, parseSentences } from "@/lib/parser";
import RequireAuth from "@/components/RequireAuth";
import { useLocale } from "@/lib/useLocale";

function NoteDetailContent() {
  const { t } = useLocale();
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editLines, setEditLines] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("id", params.id)
        .single();
      setSession(data);
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleDelete() {
    if (!confirm(t("confirmDelete"))) return;
    await supabase.from("study_sessions").delete().eq("id", params.id);
    router.push(`/notes?filter=${session?.language || "english"}`);
  }

  function startEditing(field: "stress_pronunciation" | "vocabulary" | "sentence_grammar") {
    const value = session?.[field];
    if (!value) return;
    setEditLines(parseSentences(value));
    setEditingField(field);
  }

  function handleEditLine(idx: number, value: string) {
    setEditLines((prev) => prev.map((l, i) => (i === idx ? value : l)));
  }

  function handleEditRemove(idx: number) {
    setEditLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveEdit() {
    if (!editingField) return;
    const filtered = editLines.filter((l) => l.trim().length > 0);
    const newValue = filtered.length > 0 ? filtered.join("\n") : null;

    setSaving(true);
    const { error } = await supabase
      .from("study_sessions")
      .update({ [editingField]: newValue })
      .eq("id", params.id);
    setSaving(false);

    if (error) {
      alert(t("saveFailed") + error.message);
    } else {
      setSession((prev) => prev ? { ...prev, [editingField]: newValue } : prev);
      setEditingField(null);
    }
  }

  if (loading) return <div className="text-gray-500 text-center py-12">{t("loading")}</div>;
  if (!session) return <div className="text-gray-500 text-center py-12">{t("noteNotFound")}</div>;

  const stressLines = session.stress_pronunciation ? parseSentences(session.stress_pronunciation) : [];
  const vocabEntries = session.vocabulary ? parseVocabulary(session.vocabulary) : [];
  const sentences = session.sentence_grammar ? parseSentences(session.sentence_grammar) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              session.language === "english"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-red-500/20 text-red-400"
            }`}>
              {session.language === "english" ? "English" : "日本語"}
            </span>
            <span className="text-sm text-gray-500">{session.study_date}</span>
          </div>
          {session.title && <h1 className="text-2xl font-bold">{session.title}</h1>}
        </div>
      </div>

      {/* Stress & Pronunciation */}
      {session.stress_pronunciation && (
        <SectionCard
          title="Stress & Pronunciation"
          icon="🔊"
          color="purple"
          action={editingField === "stress_pronunciation" ? (
            <div className="flex items-center gap-2">
              <button onClick={handleSaveEdit} disabled={saving} className="text-green-400 hover:text-green-300 disabled:opacity-50 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button onClick={() => setEditingField(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => startEditing("stress_pronunciation")}
              className="text-xs text-gray-500 hover:text-purple-400 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          )}
        >
          {editingField === "stress_pronunciation" ? (
            <EditableLines
              lines={editLines}
              onChangeLine={handleEditLine}
              onRemoveLine={handleEditRemove}
            />
          ) : (
            <div className="space-y-2">
              {stressLines.map((s, i) => (
                <div key={i} className="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-300">
                  {s}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Vocabulary */}
      {session.vocabulary && (
        <SectionCard
          title="Vocabulary"
          icon="📖"
          color="green"
          action={editingField === "vocabulary" ? (
            <div className="flex items-center gap-2">
              <button onClick={handleSaveEdit} disabled={saving} className="text-green-400 hover:text-green-300 disabled:opacity-50 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button onClick={() => setEditingField(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => startEditing("vocabulary")}
              className="text-xs text-gray-500 hover:text-green-400 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          )}
        >
          {editingField === "vocabulary" ? (
            <EditableLines
              lines={editLines}
              onChangeLine={handleEditLine}
              onRemoveLine={handleEditRemove}
            />
          ) : vocabEntries.length > 0 ? (
            <div className="space-y-3">
              {vocabEntries.map((v, i) => (
                <div key={i} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="font-semibold text-green-400 text-sm">{v.term}</div>
                  <div className="text-gray-300 text-sm mt-1">{v.definition}</div>
                  {v.example && (
                    <div className="text-gray-400 text-sm mt-1 italic">→ {v.example}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-300">
              {session.vocabulary}
            </pre>
          )}
        </SectionCard>
      )}

      {/* Sentence Structure & Grammar */}
      {session.sentence_grammar && (
        <SectionCard
          title="Sentence Structure & Grammar"
          icon="✏️"
          color="blue"
          action={editingField === "sentence_grammar" ? (
            <div className="flex items-center gap-2">
              <button onClick={handleSaveEdit} disabled={saving} className="text-green-400 hover:text-green-300 disabled:opacity-50 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button onClick={() => setEditingField(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => startEditing("sentence_grammar")}
              className="text-xs text-gray-500 hover:text-blue-400 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          )}
        >
          {editingField === "sentence_grammar" ? (
            <EditableLines
              lines={editLines}
              onChangeLine={handleEditLine}
              onRemoveLine={handleEditRemove}
            />
          ) : (
            <div className="space-y-2">
              {sentences.map((s, i) => (
                <div key={i} className="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-300">
                  {s}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Comment */}
      {session.comment && (
        <SectionCard title="Comment" icon="💬" color="yellow">
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-300">
            {session.comment}
          </pre>
        </SectionCard>
      )}

      {/* Delete */}
      <div className="pt-4 pb-8 text-center">
        <button
          onClick={handleDelete}
          className="text-sm text-red-400/50 hover:text-red-400 transition-colors"
        >
          {t("deleteNote")}
        </button>
      </div>
    </div>
  );
}

export default function NoteDetailPage() {
  return (
    <RequireAuth>
      <NoteDetailContent />
    </RequireAuth>
  );
}

function EditableLines({
  lines, onChangeLine, onRemoveLine,
}: {
  lines: string[];
  onChangeLine: (idx: number, value: string) => void;
  onRemoveLine: (idx: number) => void;
}) {
  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={line}
            onChange={(e) => onChangeLine(i, e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
          />
          <button
            onClick={() => onRemoveLine(i)}
            className="text-gray-600 hover:text-red-400 px-1 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  title, icon, color, children, action,
}: {
  title: string; icon: string; color: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  const borderColors: Record<string, string> = {
    purple: "border-purple-500/30",
    green: "border-green-500/30",
    blue: "border-blue-500/30",
    yellow: "border-yellow-500/30",
  };
  const titleColors: Record<string, string> = {
    purple: "text-purple-400",
    green: "text-green-400",
    blue: "text-blue-400",
    yellow: "text-yellow-400",
  };

  return (
    <div className={`bg-gray-900 border ${borderColors[color]} rounded-xl overflow-hidden`}>
      <div className="px-5 py-3 border-b border-gray-800/50 flex items-center justify-between">
        <h2 className={`text-sm font-semibold ${titleColors[color]}`}>
          {icon} {title}
        </h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
