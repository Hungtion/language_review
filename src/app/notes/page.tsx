"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase, StudySession } from "@/lib/supabase";
import RequireAuth from "@/components/RequireAuth";
import { useLocale } from "@/lib/useLocale";
import GuideOverlay from "@/components/GuideOverlay";

function NotesContent() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialFilter = (searchParams.get("filter") as "english" | "japanese")
    || (typeof window !== "undefined" && localStorage.getItem("lang-filter") as "english" | "japanese")
    || "english";
  const initialSearch = searchParams.get("q") || "";
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [filter, setFilter] = useState<"english" | "japanese">(initialFilter);
  const [search, setSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      let query = supabase
        .from("study_sessions")
        .select("*")
        .order("study_date", { ascending: false })
        .order("created_at", { ascending: false });

      query = query.eq("language", filter);

      const { data } = await query;
      setSessions(data ?? []);
      setLoading(false);
    }
    load();
  }, [filter]);

  const updateUrl = useCallback((f: string, q: string) => {
    const params = new URLSearchParams();
    params.set("filter", f);
    if (q.trim()) params.set("q", q.trim());
    router.replace(`/notes?${params.toString()}`, { scroll: false });
  }, [router]);

  function handleFilterChange(f: "english" | "japanese") {
    setFilter(f);
    localStorage.setItem("lang-filter", f);
    updateUrl(f, search);
  }

  function handleSearchChange(q: string) {
    setSearch(q);
    updateUrl(filter, q);
  }

  const filtered = search.trim()
    ? sessions.filter((s) => {
        const q = search.toLowerCase();
        return (
          (s.title && s.title.toLowerCase().includes(q)) ||
          (s.stress_pronunciation && s.stress_pronunciation.toLowerCase().includes(q)) ||
          (s.vocabulary && s.vocabulary.toLowerCase().includes(q)) ||
          (s.sentence_grammar && s.sentence_grammar.toLowerCase().includes(q)) ||
          (s.comment && s.comment.toLowerCase().includes(q))
        );
      })
    : sessions;

  return (
    <div className="space-y-6">
      <GuideOverlay pageKey="notes" />
      <div className="flex gap-2 items-center">
        <div data-guide="notes-search" className="flex-[2]">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="🔍"
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <Link
          data-guide="notes-add"
          href={`/add?lang=${filter}`}
          className="px-7 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shrink-0"
        >
          +
        </Link>
        <div data-guide="notes-lang" className="flex gap-1 bg-gray-900 rounded-lg p-1 shrink-0">
          {(["english", "japanese"] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                filter === f
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {f === "english" ? "🇺🇸" : "🇯🇵"}
            </button>
          ))}
        </div>
      </div>

      <div data-guide="notes-list" className="space-y-3 flex-1" style={{ minHeight: "calc(100vh - 10rem)" }}>
        {loading ? (
          <div className="text-gray-500 text-center py-12">{t("loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            {search.trim() ? (
              <p className="text-gray-500">{t("noSearchResults")}</p>
            ) : (
              <>
                <p className="text-gray-500 mb-4">{t("noNotes")}</p>
                <Link href="/add" className="text-indigo-400 hover:text-indigo-300">
                  {t("firstNote")}
                </Link>
              </>
            )}
          </div>
        ) : (
          filtered.map((s) => (
            <Link
              key={s.id}
              href={`/notes/${s.id}`}
              className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  s.language === "english"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {s.language === "english" ? "English" : "日本語"}
                </span>
                <span className="text-sm text-gray-500">{s.study_date}</span>
                {s.title && (
                  <span className="text-sm text-gray-300 font-medium">{s.title}</span>
                )}
              </div>

              <div className="flex gap-4 text-xs text-gray-600">
                {s.stress_pronunciation && <span>🔊 {t("pronunciation")}</span>}
                {s.vocabulary && <span>📖 {t("vocabulary")}</span>}
                {s.sentence_grammar && s.title !== "Nuance" && s.title !== "AI Examples" && <span>✏️ {t("grammar")}</span>}
                {s.comment && <span>💬 {t("comment")}</span>}
              </div>

              {s.vocabulary && (
                <p className="text-gray-500 text-sm mt-2 truncate group-hover:text-gray-400">
                  {s.vocabulary.slice(0, 120)}...
                </p>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export default function NotesPage() {
  return (
    <RequireAuth>
      <NotesContent />
    </RequireAuth>
  );
}
