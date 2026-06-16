"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, StudySession } from "@/lib/supabase";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";

function HomeContent() {
  const { user } = useAuth();
  const [recent, setRecent] = useState<StudySession[]>([]);
  const [counts, setCounts] = useState({ english: 0, japanese: 0 });

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await supabase
        .from("study_sessions")
        .select("*")
        .order("study_date", { ascending: false })
        .limit(5);
      if (data) setRecent(data);

      const { count: engCount } = await supabase
        .from("study_sessions")
        .select("*", { count: "exact", head: true })
        .eq("language", "english");

      const { count: jpnCount } = await supabase
        .from("study_sessions")
        .select("*", { count: "exact", head: true })
        .eq("language", "japanese");

      setCounts({ english: engCount ?? 0, japanese: jpnCount ?? 0 });
    }
    load();
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="pt-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Sean&apos;s Language Lab
        </h1>
        <p className="text-gray-400 mt-2">영어 & 일본어 학습 복습 노트</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-blue-400 text-sm font-medium">English</div>
          <div className="text-3xl font-bold mt-1">{counts.english}</div>
          <div className="text-gray-500 text-sm">세션 기록</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-red-400 text-sm font-medium">日本語</div>
          <div className="text-3xl font-bold mt-1">{counts.japanese}</div>
          <div className="text-gray-500 text-sm">세션 기록</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/add"
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl p-5 text-center transition-colors"
        >
          <div className="text-2xl mb-1">+</div>
          <div className="font-medium">새 노트 입력</div>
        </Link>
        <Link
          href="/review"
          className="bg-gray-800 hover:bg-gray-700 text-white rounded-xl p-5 text-center transition-colors"
        >
          <div className="text-2xl mb-1">📖</div>
          <div className="font-medium">복습 카드</div>
        </Link>
      </div>

      {/* Recent */}
      {recent.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">최근 학습</h2>
          <div className="space-y-2">
            {recent.map((s) => (
              <Link
                key={s.id}
                href={`/notes/${s.id}`}
                className="block bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    s.language === "english"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-red-500/20 text-red-400"
                  }`}>
                    {s.language === "english" ? "EN" : "JP"}
                  </span>
                  <span className="text-sm text-gray-400">{s.study_date}</span>
                  {s.title && <span className="text-sm text-gray-300">{s.title}</span>}
                </div>
                {s.vocabulary && (
                  <p className="text-gray-500 text-sm mt-1 truncate">{s.vocabulary.slice(0, 100)}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <RequireAuth>
      <HomeContent />
    </RequireAuth>
  );
}
