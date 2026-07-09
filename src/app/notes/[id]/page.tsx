"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase, StudySession } from "@/lib/supabase";
import { parseVocabulary, parseSentences } from "@/lib/parser";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/useLocale";
import { getGuestNotes, deleteGuestNote } from "@/lib/guestStorage";

function NoteDetailContent() {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<StudySession | null>(null);
  const [prevId, setPrevId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editLines, setEditLines] = useState<string[]>([]);
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      const notes = getGuestNotes();
      const idx = notes.findIndex((n) => n.id === params.id);
      setSession(idx >= 0 ? notes[idx] : null);
      setPrevId(idx > 0 ? notes[idx - 1].id : null);
      setNextId(idx >= 0 && idx < notes.length - 1 ? notes[idx + 1].id : null);
      setLoading(false);
      return;
    }
    async function load() {
      const { data } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("id", params.id)
        .single();
      setSession(data);

      if (data) {
        // Fetch prev (newer note)
        const { data: prev } = await supabase
          .from("study_sessions")
          .select("id")
          .eq("language", data.language)
          .or(`study_date.gt.${data.study_date},and(study_date.eq.${data.study_date},created_at.gt.${data.created_at})`)
          .order("study_date", { ascending: true })
          .order("created_at", { ascending: true })
          .limit(1);
        setPrevId(prev && prev.length > 0 ? prev[0].id : null);

        // Fetch next (older note)
        const { data: next } = await supabase
          .from("study_sessions")
          .select("id")
          .eq("language", data.language)
          .or(`study_date.lt.${data.study_date},and(study_date.eq.${data.study_date},created_at.lt.${data.created_at})`)
          .order("study_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1);
        setNextId(next && next.length > 0 ? next[0].id : null);
      }

      setLoading(false);
    }
    load();
  }, [params.id, user]);

  async function handleDelete() {
    if (!confirm(t("confirmDelete"))) return;
    if (!user) {
      deleteGuestNote(params.id as string);
    } else {
      await supabase.from("study_sessions").delete().eq("id", params.id);
    }
    router.push(`/notes?filter=${session?.language || "english"}`);
  }

  function startEditing(field: "stress_pronunciation" | "vocabulary" | "sentence_grammar") {
    const value = session?.[field];
    if (!value) return;
    setEditLines(parseSentences(value));
    setSelectedLines(new Set());
    setEditingField(field);
  }

  function handleEditLine(idx: number, value: string) {
    setEditLines((prev) => prev.map((l, i) => (i === idx ? value : l)));
  }

  function handleEditRemove(idx: number) {
    setEditLines((prev) => prev.filter((_, i) => i !== idx));
    setSelectedLines((prev) => { const next = new Set<number>(); prev.forEach((v) => { if (v < idx) next.add(v); else if (v > idx) next.add(v - 1); }); return next; });
  }

  function toggleSelectLine(idx: number) {
    setSelectedLines((prev) => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next; });
  }

  function handleRemoveSelected() {
    setEditLines((prev) => prev.filter((_, i) => !selectedLines.has(i)));
    setSelectedLines(new Set());
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
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/notes?filter=${session?.language || "english"}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          {locale === "ko" ? "목록으로" : "Back to list"}
        </Link>
        <div className="flex items-center gap-2">
          {prevId ? (
            <Link
              href={`/notes/${prevId}`}
              title={locale === "ko" ? "이전 노트로 이동" : "Go to previous note"}
              className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </Link>
          ) : (
            <span className="p-1.5 text-gray-700"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></span>
          )}
          {nextId ? (
            <Link
              href={`/notes/${nextId}`}
              title={locale === "ko" ? "다음 노트로 이동" : "Go to next note"}
              className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </Link>
          ) : (
            <span className="p-1.5 text-gray-700"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-end justify-between">
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
        {user && (
          <button
            onClick={async () => {
              if (!session.shared) {
                await supabase.from("study_sessions").update({ shared: true }).eq("id", params.id);
                setSession((prev) => prev ? { ...prev, shared: true } : prev);
              }
              const url = `${window.location.origin}/share/${params.id}`;
              if (navigator.share) {
                navigator.share({ title: session.title || "Shared Note", url }).catch(() => {});
              } else {
                await navigator.clipboard.writeText(url);
                alert(locale === "ko" ? "공유 링크가 복사되었습니다!" : "Share link copied!");
              }
            }}
            title={locale === "ko" ? "공유하기" : "Share"}
            className={`p-2 rounded-lg transition-colors ${session.shared ? "text-indigo-400 hover:text-indigo-300" : "text-gray-500 hover:text-gray-300"}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
        )}
      </div>

      {/* Stress & Pronunciation */}
      {session.stress_pronunciation && (
        <SectionCard
          title={`Stress & Pronunciation (${stressLines.length})`}
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
              selected={selectedLines}
              onToggleSelect={toggleSelectLine}
              onRemoveSelected={handleRemoveSelected}
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
          title={`Vocabulary (${vocabEntries.length})`}
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
              selected={selectedLines}
              onToggleSelect={toggleSelectLine}
              onRemoveSelected={handleRemoveSelected}
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
          title={`Sentence Structure & Grammar (${sentences.length})`}
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
              selected={selectedLines}
              onToggleSelect={toggleSelectLine}
              onRemoveSelected={handleRemoveSelected}
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
  lines, onChangeLine, onRemoveLine, selected, onToggleSelect, onRemoveSelected,
}: {
  lines: string[];
  onChangeLine: (idx: number, value: string) => void;
  onRemoveLine: (idx: number) => void;
  selected: Set<number>;
  onToggleSelect: (idx: number) => void;
  onRemoveSelected: () => void;
}) {
  const lastCheckedRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  function handleCheck(i: number, e: React.MouseEvent) {
    if (e.shiftKey && lastCheckedRef.current !== null) {
      const from = Math.min(lastCheckedRef.current, i);
      const to = Math.max(lastCheckedRef.current, i);
      for (let idx = from; idx <= to; idx++) {
        if (!selected.has(idx)) onToggleSelect(idx);
      }
    } else {
      onToggleSelect(i);
    }
    lastCheckedRef.current = i;
  }

  function handleTouchStart(i: number) {
    draggingRef.current = true;
    lastCheckedRef.current = i;
    if (!selected.has(i)) onToggleSelect(i);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!draggingRef.current) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return;
    const row = el.closest("[data-line-idx]");
    if (!row) return;
    const idx = parseInt(row.getAttribute("data-line-idx")!, 10);
    if (isNaN(idx) || lastCheckedRef.current === null) return;
    const from = Math.min(lastCheckedRef.current, idx);
    const to = Math.max(lastCheckedRef.current, idx);
    for (let j = from; j <= to; j++) {
      if (!selected.has(j)) onToggleSelect(j);
    }
  }

  function handleTouchEnd() {
    draggingRef.current = false;
  }

  return (
    <div className="space-y-2" onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <span className="text-sm text-red-400">{selected.size}개 선택됨</span>
          <button onClick={onRemoveSelected} className="text-sm text-red-400 hover:text-red-300 font-medium">선택 삭제</button>
        </div>
      )}
      {lines.map((line, i) => (
        <div key={i} data-line-idx={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected.has(i)}
            onChange={() => {}}
            onClick={(e) => handleCheck(i, e)}
            onTouchStart={() => handleTouchStart(i)}
            className="w-4 h-4 shrink-0 accent-red-500"
          />
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
