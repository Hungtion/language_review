"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, StudySession } from "@/lib/supabase";
import { parseVocabulary, parseSentences } from "@/lib/parser";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/useLocale";

export default function SharePage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("id", params.id)
        .eq("shared", true)
        .maybeSingle();
      setSession(data);
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleAdd() {
    if (!user) {
      router.push(`/login?redirect=/share/${params.id}`);
      return;
    }
    if (!session) return;

    setAdding(true);
    const { error } = await supabase.from("study_sessions").insert({
      language: session.language,
      study_date: new Date().toISOString().split("T")[0],
      title: session.title ? `${session.title} (shared)` : "Shared Note",
      stress_pronunciation: session.stress_pronunciation,
      vocabulary: session.vocabulary,
      sentence_grammar: session.sentence_grammar,
      comment: session.comment,
      raw_input: session.raw_input || "",
      user_id: user.id,
    });
    setAdding(false);

    if (error) {
      alert(error.message);
    } else {
      setAdded(true);
      setTimeout(() => router.push("/notes"), 1500);
    }
  }

  if (loading) {
    return <div className="text-text-faint text-center py-20">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-text-faint text-lg mb-2">
          {locale === "ko" ? "공유된 노트를 찾을 수 없습니다" : "Shared note not found"}
        </p>
        <p className="text-text-faint text-sm">
          {locale === "ko" ? "링크가 만료되었거나 공유가 해제되었습니다" : "The link may have expired or been unshared"}
        </p>
      </div>
    );
  }

  const stressLines = session.stress_pronunciation ? parseSentences(session.stress_pronunciation) : [];
  const vocabEntries = session.vocabulary ? parseVocabulary(session.vocabulary) : [];
  const sentences = session.sentence_grammar ? parseSentences(session.sentence_grammar) : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <p className="text-xs text-primary font-medium uppercase tracking-wider">
          {locale === "ko" ? "공유된 노트" : "Shared Note"}
        </p>
        <div className="flex items-center justify-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            session.language === "english"
              ? "bg-primary/20 text-primary"
              : "bg-primary/20 text-primary"
          }`}>
            {session.language === "english" ? "English" : "Japanese"}
          </span>
          <span className="text-sm text-text-faint">{session.study_date}</span>
        </div>
        {session.title && <h1 className="text-2xl font-bold">{session.title}</h1>}
      </div>

      {/* Add Button */}
      <div className="text-center">
        {added ? (
          <p className="text-primary font-medium">
            {locale === "ko" ? "노트가 추가되었습니다! 이동 중..." : "Note added! Redirecting..."}
          </p>
        ) : (
          <button
            onClick={handleAdd}
            disabled={adding}
            className="px-8 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
          >
            {adding
              ? (locale === "ko" ? "추가 중..." : "Adding...")
              : (locale === "ko" ? "내 노트에 추가" : "Add to my notes")}
          </button>
        )}
      </div>

      {/* Stress & Pronunciation */}
      {stressLines.length > 0 && (
        <Section title={`Stress & Pronunciation (${stressLines.length})`} icon="🔊">
          <div className="space-y-2">
            {stressLines.map((s, i) => (
              <div key={i} className="bg-bg-input/50 rounded-lg p-3 text-sm text-text-secondary">{s}</div>
            ))}
          </div>
        </Section>
      )}

      {/* Vocabulary */}
      {vocabEntries.length > 0 && (
        <Section title={`Vocabulary (${vocabEntries.length})`} icon="📖">
          <div className="space-y-3">
            {vocabEntries.map((v, i) => (
              <div key={i} className="bg-bg-input/50 rounded-lg p-3">
                <div className="font-semibold text-primary text-sm">{v.term}</div>
                <div className="text-text-secondary text-sm mt-1">{v.definition}</div>
                {v.example && <div className="text-text-muted text-sm mt-1 italic">→ {v.example}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Sentences */}
      {sentences.length > 0 && (
        <Section title={`Sentences (${sentences.length})`} icon="✏️">
          <div className="space-y-2">
            {sentences.map((s, i) => (
              <div key={i} className="bg-bg-input/50 rounded-lg p-3 text-sm text-text-secondary">{s}</div>
            ))}
          </div>
        </Section>
      )}

      {/* Comment */}
      {session.comment && (
        <Section title="Comment" icon="💬">
          <pre className="whitespace-pre-wrap font-sans text-sm text-text-secondary">{session.comment}</pre>
        </Section>
      )}

    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-text-muted mb-3">{icon} {title}</h2>
      {children}
    </div>
  );
}
