"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, StudySession } from "@/lib/supabase";
import { parseVocabulary, parseSentences } from "@/lib/parser";
import RequireAuth from "@/components/RequireAuth";

function NoteDetailContent() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
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
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await supabase.from("study_sessions").delete().eq("id", params.id);
    router.push("/notes");
  }

  function startEditing() {
    if (!session?.sentence_grammar) return;
    setEditLines(parseSentences(session.sentence_grammar));
    setEditing(true);
  }

  function handleEditLine(idx: number, value: string) {
    setEditLines((prev) => prev.map((l, i) => (i === idx ? value : l)));
  }

  function handleEditRemove(idx: number) {
    setEditLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveEdit() {
    const filtered = editLines.filter((l) => l.trim().length > 0);
    const newValue = filtered.length > 0 ? filtered.join("\n") : null;

    setSaving(true);
    const { error } = await supabase
      .from("study_sessions")
      .update({ sentence_grammar: newValue })
      .eq("id", params.id);
    setSaving(false);

    if (error) {
      alert("저장 실패: " + error.message);
    } else {
      setSession((prev) => prev ? { ...prev, sentence_grammar: newValue } : prev);
      setEditing(false);
    }
  }

  if (loading) return <div className="text-gray-500 text-center py-12">로딩 중...</div>;
  if (!session) return <div className="text-gray-500 text-center py-12">노트를 찾을 수 없습니다.</div>;

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
        <button
          onClick={handleDelete}
          className="text-xs text-gray-600 hover:text-red-400 transition-colors"
        >
          삭제
        </button>
      </div>

      {/* Stress & Pronunciation */}
      {session.stress_pronunciation && (
        <SectionCard title="Stress & Pronunciation" icon="🔊" color="purple">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-300">
            {session.stress_pronunciation}
          </pre>
        </SectionCard>
      )}

      {/* Vocabulary */}
      {session.vocabulary && (
        <SectionCard title="Vocabulary" icon="📖" color="green">
          {vocabEntries.length > 0 ? (
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
          action={!editing ? (
            <button
              onClick={startEditing}
              className="text-xs text-gray-500 hover:text-blue-400 transition-colors"
            >
              편집
            </button>
          ) : undefined}
        >
          {editing ? (
            <div className="space-y-2">
              {editLines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={line}
                    onChange={(e) => handleEditLine(i, e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={() => handleEditRemove(i)}
                    className="text-gray-600 hover:text-red-400 text-sm px-2 transition-colors"
                  >
                    X
                  </button>
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
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
