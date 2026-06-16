"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, StudySession } from "@/lib/supabase";
import { parseVocabulary, parseSentences } from "@/lib/parser";

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(true);

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
        <SectionCard title="Sentence Structure & Grammar" icon="✏️" color="blue">
          <div className="space-y-2">
            {sentences.map((s, i) => (
              <div key={i} className="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-300">
                {s}
              </div>
            ))}
          </div>
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

function SectionCard({
  title, icon, color, children,
}: {
  title: string; icon: string; color: string; children: React.ReactNode;
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
      <div className="px-5 py-3 border-b border-gray-800/50">
        <h2 className={`text-sm font-semibold ${titleColors[color]}`}>
          {icon} {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
