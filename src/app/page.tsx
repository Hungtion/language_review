"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, StudySession } from "@/lib/supabase";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/useLocale";
import GuideOverlay from "@/components/GuideOverlay";

function HomeContent() {
  const { user, plan } = useAuth();
  const { t } = useLocale();
  const [recent, setRecent] = useState<StudySession[]>([]);
  const [counts, setCounts] = useState({ english: 0, japanese: 0 });

  useEffect(() => {
    if (!user) { setRecent([]); return; }
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
      <GuideOverlay pageKey="home" />
      <div className="pt-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-400 mt-2">{t("langLabDesc")}</p>
      </div>

      {/* Stats */}
      <div data-guide="stats" className="grid grid-cols-2 gap-4">
        <Link
          href="/notes?filter=english"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors text-center"
        >
          <div className="text-blue-400 text-sm font-medium">English</div>
          <div className="text-3xl font-bold mt-1">{counts.english}</div>
        </Link>
        <Link
          href="/notes?filter=japanese"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors text-center"
        >
          <div className="text-red-400 text-sm font-medium">日本語</div>
          <div className="text-3xl font-bold mt-1">{counts.japanese}</div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div data-guide="quick-actions" className="grid grid-cols-2 gap-4">
        <Link
          href="/add"
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl p-5 text-center transition-colors"
        >
          <div className="text-2xl mb-1">+</div>
          <div className="font-medium">{t("addNote")}</div>
        </Link>
        <Link
          href="/review"
          className="bg-gray-800 hover:bg-gray-700 text-white rounded-xl p-5 text-center transition-colors"
        >
          <div className="flex justify-center mb-1">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="1" width="11" height="15" rx="2" fill="currentColor" opacity={0.3} />
              <rect x="5" y="4" width="11" height="15" rx="2" fill="currentColor" opacity={0.5} />
              <rect x="8" y="7" width="11" height="15" rx="2" fill="currentColor" opacity={1} />
            </svg>
          </div>
          <div className="font-medium">{t("reviewCards")}</div>
        </Link>
      </div>

      {/* Recent */}
      {recent.length > 0 && (
        <div data-guide="recent-notes">
          <h2 className="text-lg font-semibold mb-3">{t("recentNotes")}</h2>
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
