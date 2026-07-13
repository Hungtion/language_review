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
import { getAiUsage, DAILY_LIMIT, GUEST_LIMIT, getGuestUsage, incrementGuestUsage, useAiCredit } from "@/lib/aiUsage";
import { getCredits } from "@/lib/credits";
import CreditModal from "@/components/CreditModal";
import GuideOverlay from "@/components/GuideOverlay";

function NoteDetailContent() {
  const { user, plan } = useAuth();
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
  const [splitTarget, setSplitTarget] = useState<{ field: string; lineIdx: number; text: string } | null>(null);
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitPreview, setSplitPreview] = useState<string[] | null>(null);
  const [splitDeleteOrig, setSplitDeleteOrig] = useState(true);
  const [splitSelected, setSplitSelected] = useState<Set<number>>(new Set());
  const [splitDeleteConfirm, setSplitDeleteConfirm] = useState(false);
  const [splitDontAsk, setSplitDontAsk] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ field: string; lineIdx: number } | null>(null);
  const [splitAiConfirm, setSplitAiConfirm] = useState<{ field: string; lineIdx: number; text: string } | null>(null);
  const [splitNoResult, setSplitNoResult] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [aiRemaining, setAiRemaining] = useState<number>(DAILY_LIMIT);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [userCredits, setUserCredits] = useState(0);

  useEffect(() => {
    if (!user) {
      setAiRemaining(getGuestUsage().remaining);
    } else {
      getAiUsage(user.id).then(({ remaining }) => setAiRemaining(remaining));
      getCredits(user.id).then((c) => setUserCredits(c));
    }
  }, [user]);

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

      // Mark note as seen
      try {
        const seen = new Set(JSON.parse(localStorage.getItem("seen-notes") || "[]"));
        if (!seen.has(params.id)) {
          seen.add(params.id);
          localStorage.setItem("seen-notes", JSON.stringify([...seen].slice(-500)));
        }
      } catch {}
    }
    load();
  }, [params.id, user]);

  async function handleDelete() {
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

  async function handleDeleteLineConfirm() {
    if (!deleteTarget) return;
    const { field, lineIdx } = deleteTarget;
    const fieldValue = session?.[field as keyof StudySession] as string;
    if (!fieldValue) return;
    const lines = parseSentences(fieldValue);
    const newLines = lines.filter((_, i) => i !== lineIdx);
    const newValue = newLines.length > 0 ? newLines.join("\n") : null;
    const { error } = await supabase
      .from("study_sessions")
      .update({ [field]: newValue })
      .eq("id", params.id);
    if (error) { alert(error.message); return; }
    setSession((prev) => prev ? { ...prev, [field]: newValue } : prev);
    setDeleteTarget(null);
  }

  function handleShareLine(text: string) {
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert(locale === "ko" ? "복사되었습니다" : "Copied");
      });
    }
  }

  function hasMultipleSentences(text: string) {
    const matches = text.match(/[.!?。！？]\s/g);
    const endsWithPunct = /[.!?。！？]$/.test(text.trim());
    const count = (matches?.length || 0) + (endsWithPunct ? 1 : 0);
    return count >= 2;
  }

  async function handleSplitLine(field: string, lineIdx: number, text: string) {
    // Check AI usage limit
    if (!user) {
      const { remaining } = getGuestUsage();
      if (remaining <= 0) { alert(t("aiLimitReached")); return; }
    } else if (plan !== "pro") {
      const { remaining } = await getAiUsage(user.id);
      if (remaining <= 0 && userCredits <= 0) { setShowCreditModal(true); return; }
    }

    setSplitTarget({ field, lineIdx, text });
    setSplitLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "split-sentence", text }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        setSplitTarget(null);
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
        setSplitTarget(null);
      }
    } catch {
      alert(locale === "ko" ? "요청 실패" : "Request failed");
      setSplitTarget(null);
    }
    setSplitLoading(false);
  }

  async function doSplitConfirm(target: { field: string; lineIdx: number; text: string }, sentences: string[], deleteOrig: boolean) {
    const { field, lineIdx } = target;
    const fieldValue = session?.[field as keyof StudySession] as string;
    if (!fieldValue) return;

    const lines = parseSentences(fieldValue);
    const newLines = deleteOrig
      ? [...lines.slice(0, lineIdx), ...sentences, ...lines.slice(lineIdx + 1)]
      : [...lines.slice(0, lineIdx + 1), ...sentences, ...lines.slice(lineIdx + 1)];
    const newValue = newLines.join("\n");

    const { error } = await supabase
      .from("study_sessions")
      .update({ [field]: newValue })
      .eq("id", params.id);

    if (error) {
      alert(t("saveFailed") + error.message);
    } else {
      setSession((prev) => prev ? { ...prev, [field]: newValue } : prev);
    }
    setSplitTarget(null);
    setSplitPreview(null);
  }

  async function handleSplitConfirm() {
    if (!splitTarget || !splitPreview) return;
    const selected = splitPreview.filter((_, i) => splitSelected.has(i));
    if (selected.length === 0) { setSplitTarget(null); setSplitPreview(null); return; }
    await doSplitConfirm(splitTarget, selected, true);
  }

  async function doSplitKeep() {
    if (!splitTarget || !splitPreview) return;
    const selected = splitPreview.filter((_, i) => splitSelected.has(i));
    if (selected.length === 0) { setSplitTarget(null); setSplitPreview(null); return; }
    await doSplitConfirm(splitTarget, selected, false);
  }

  if (loading) return <div className="text-text-faint text-center py-12">{t("loading")}</div>;
  if (!session) return <div className="text-text-faint text-center py-12">{t("noteNotFound")}</div>;

  const stressLines = session.stress_pronunciation ? parseSentences(session.stress_pronunciation) : [];
  const vocabEntries = session.vocabulary ? parseVocabulary(session.vocabulary) : [];
  const sentences = session.sentence_grammar ? parseSentences(session.sentence_grammar) : [];

  return (
    <div className="space-y-6">
      <GuideOverlay pageKey="note-detail" />
      {showCreditModal && <CreditModal onClose={() => setShowCreditModal(false)} />}
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/notes?filter=${session?.language || "english"}`}
          className="inline-flex items-center gap-1 text-sm text-text-faint hover:text-text-secondary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          {locale === "ko" ? "목록으로" : "Back to list"}
        </Link>
        <div className="flex items-center gap-2">
          {prevId ? (
            <Link
              href={`/notes/${prevId}`}
              title={locale === "ko" ? "이전 노트로 이동" : "Go to previous note"}
              className="p-1.5 text-text-faint hover:text-text-secondary transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </Link>
          ) : (
            <span className="p-1.5 text-text-faint"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></span>
          )}
          {nextId ? (
            <Link
              href={`/notes/${nextId}`}
              title={locale === "ko" ? "다음 노트로 이동" : "Go to next note"}
              className="p-1.5 text-text-faint hover:text-text-secondary transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </Link>
          ) : (
            <span className="p-1.5 text-text-faint"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
          )}
        </div>
      </div>

      {/* Header */}
      <div data-guide="note-header" className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              session.language === "english"
                ? "bg-primary/20 text-primary"
                : "bg-primary/20 text-primary"
            }`}>
              {session.language === "english" ? "English" : "日本語"}
            </span>
            <span className="text-sm text-text-faint">{session.study_date}</span>
          </div>
          {session.title && <h1 className="text-2xl font-bold">{session.title}</h1>}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/review?noteId=${params.id}`}
            title={locale === "ko" ? "이 노트 카드로 복습" : "Review this note as cards"}
            className="p-2 rounded-lg text-text-faint hover:text-primary transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="14" height="17" rx="2" />
              <path d="M8 2h10a2 2 0 012 2v14" />
            </svg>
          </Link>
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
            className={`p-2 rounded-lg transition-colors ${session.shared ? "text-primary hover:text-primary" : "text-text-faint hover:text-text-secondary"}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
        )}
        </div>
      </div>

      <div data-guide="note-sections" className="space-y-6">
      {/* Stress & Pronunciation */}
      {session.stress_pronunciation && (
        <SectionCard
          title={`Stress & Pronunciation (${stressLines.length})`}
          icon="🔊"
          color="purple"
          action={editingField === "stress_pronunciation" ? (
            <div className="flex items-center gap-2">
              <button onClick={handleSaveEdit} disabled={saving} className="text-primary hover:text-primary-hover disabled:opacity-50 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button onClick={() => setEditingField(null)} className="text-text-faint hover:text-text-secondary transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => startEditing("stress_pronunciation")}
              className="text-xs text-text-faint hover:text-primary transition-colors"
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
                <div key={i} className="bg-bg-input/50 rounded-lg p-3 text-sm text-text-secondary flex items-center gap-2">
                  <span className="flex-1">{s}</span>
                  <LineActions
                    text={s}
                    showSplit={hasMultipleSentences(s)}
                    onShare={() => handleShareLine(s)}
                    onSplit={() => plan !== "pro" ? setSplitAiConfirm({ field: "stress_pronunciation", lineIdx: i, text: s }) : handleSplitLine("stress_pronunciation", i, s)}
                    onDelete={() => setDeleteTarget({ field: "stress_pronunciation", lineIdx: i })}
                  />
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
              <button onClick={handleSaveEdit} disabled={saving} className="text-primary hover:text-primary-hover disabled:opacity-50 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button onClick={() => setEditingField(null)} className="text-text-faint hover:text-text-secondary transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => startEditing("vocabulary")}
              className="text-xs text-text-faint hover:text-primary transition-colors"
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
                <div key={i} className="bg-bg-input/50 rounded-lg p-3 flex items-start gap-2">
                  <div className="flex-1">
                    <div className="font-semibold text-primary text-sm">{v.term}</div>
                    <div className="text-text-secondary text-sm mt-1">{v.definition}</div>
                    {v.example && (
                      <div className="text-text-muted text-sm mt-1 italic">→ {v.example}</div>
                    )}
                  </div>
                  <LineActions
                    text={`${v.term}: ${v.definition}${v.example ? ` (${v.example})` : ""}`}
                    showSplit={false}
                    onShare={() => handleShareLine(`${v.term}: ${v.definition}${v.example ? ` (${v.example})` : ""}`)}
                    onSplit={() => {}}
                    onDelete={() => setDeleteTarget({ field: "vocabulary", lineIdx: i })}
                  />
                </div>
              ))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm text-text-secondary">
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
              <button onClick={handleSaveEdit} disabled={saving} className="text-primary hover:text-primary-hover disabled:opacity-50 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button onClick={() => setEditingField(null)} className="text-text-faint hover:text-text-secondary transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => startEditing("sentence_grammar")}
              className="text-xs text-text-faint hover:text-primary transition-colors"
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
                <div key={i} className="bg-bg-input/50 rounded-lg p-3 text-sm text-text-secondary flex items-center gap-2">
                  <span className="flex-1">{s}</span>
                  <LineActions
                    text={s}
                    showSplit={hasMultipleSentences(s)}
                    onShare={() => handleShareLine(s)}
                    onSplit={() => plan !== "pro" ? setSplitAiConfirm({ field: "sentence_grammar", lineIdx: i, text: s }) : handleSplitLine("sentence_grammar", i, s)}
                    onDelete={() => setDeleteTarget({ field: "sentence_grammar", lineIdx: i })}
                  />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      </div>

      {/* Comment */}
      {session.comment && (
        <SectionCard title="Comment" icon="💬" color="yellow">
          <pre className="whitespace-pre-wrap font-sans text-sm text-text-secondary">
            {session.comment}
          </pre>
        </SectionCard>
      )}

      {/* Delete */}
      <div className="pt-4 pb-8 text-center">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-sm text-red-400/50 hover:text-red-400 transition-colors"
        >
          {t("deleteNote")}
        </button>
      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border-light rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <h3 className="text-lg font-bold text-text">
              {locale === "ko" ? "노트 삭제" : "Delete Note"}
            </h3>
            <p className="text-sm text-text-muted">
              {t("confirmDelete")}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-2.5 bg-bg-input hover:bg-bg-hover text-text-secondary rounded-xl text-sm transition-colors"
              >
                {locale === "ko" ? "취소" : "Cancel"}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); handleDelete(); }}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Preview Modal */}
      {(splitTarget && (splitLoading || splitPreview)) && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => { setSplitTarget(null); setSplitPreview(null); }}>
          <div className="bg-bg-card border border-border-light rounded-xl w-full max-w-md max-h-[70vh] overflow-y-auto p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-center">
              {locale === "ko" ? "카드 나누기 미리보기" : "Split Preview"}
            </h3>
            <div className="bg-bg-input/50 rounded-lg p-3 text-sm text-text-muted">
              <span className="text-xs text-text-faint block mb-1">{locale === "ko" ? "원본" : "Original"}</span>
              {splitTarget?.text}
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
                    onClick={() => { setSplitTarget(null); setSplitPreview(null); }}
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
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSplitAiConfirm(null)}>
          <div className="bg-bg-card border border-border-light rounded-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-center">
              {locale === "ko" ? "카드 나누기" : "Split Sentences"}
            </h3>
            <p className="text-sm text-text-muted text-center">
              {locale === "ko" ? "LAB 카드 나누기 기능입니다." : "LAB split card feature."}
            </p>
            <p className="text-[10px] text-text-faint text-center">
              {locale === "ko"
                ? `일일 무료 ${aiRemaining}/${DAILY_LIMIT}회 남음${aiRemaining <= 0 ? " (내 Leaf 차감)" : ""}`
                : `Free ${aiRemaining}/${DAILY_LIMIT} remaining${aiRemaining <= 0 ? " (Leaf deducted)" : ""}`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSplitAiConfirm(null)}
                className="flex-1 py-2.5 bg-bg-input text-text-muted rounded-lg text-sm hover:bg-bg-hover transition-colors"
              >
                {locale === "ko" ? "취소" : "Cancel"}
              </button>
              <button
                onClick={() => { const t = splitAiConfirm; setSplitAiConfirm(null); handleSplitLine(t.field, t.lineIdx, t.text); }}
                className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-500 transition-colors"
              >
                {locale === "ko" ? "🍃 카드 나누기" : "🍃 Split"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-bg-card border border-border-light rounded-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-center">
              {locale === "ko" ? "항목 삭제" : "Delete Item"}
            </h3>
            <p className="text-sm text-text-muted text-center">
              {locale === "ko" ? "이 항목을 삭제하시겠습니까?" : "Delete this item?"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-bg-input text-text-muted rounded-lg text-sm hover:bg-bg-hover transition-colors"
              >
                {locale === "ko" ? "취소" : "Cancel"}
              </button>
              <button
                onClick={handleDeleteLineConfirm}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500 transition-colors"
              >
                {locale === "ko" ? "삭제" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
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
            className="flex-1 bg-bg-input border border-border-light rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
          />
          <button
            onClick={() => onRemoveLine(i)}
            className="text-text-faint hover:text-red-400 px-1 transition-colors"
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
    purple: "border-primary/30",
    green: "border-primary/30",
    blue: "border-primary/30",
    yellow: "border-primary/30",
  };
  const titleColors: Record<string, string> = {
    purple: "text-primary",
    green: "text-primary",
    blue: "text-primary",
    yellow: "text-primary",
  };

  return (
    <div className={`bg-bg-card border ${borderColors[color]} rounded-xl overflow-hidden`}>
      <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
        <h2 className={`text-sm font-semibold ${titleColors[color]}`}>
          {icon} {title}
        </h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function LineActions({ showSplit, onShare, onSplit, onDelete }: {
  text: string;
  showSplit: boolean;
  onShare: () => void;
  onSplit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button onClick={onShare} title="Share" className="text-text-faint hover:text-text-secondary transition-colors">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
      </button>
      {showSplit && (
        <button onClick={onSplit} title="Split" className="text-text-faint hover:text-orange-400 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="8" x2="12" y2="11"/><line x1="12" y1="14" x2="12" y2="19"/><line x1="12" y1="22" x2="12" y2="23"/></svg>
        </button>
      )}
      <button onClick={onDelete} title="Delete" className="text-text-faint hover:text-red-400 transition-colors">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
      </button>
    </div>
  );
}
