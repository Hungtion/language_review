"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase, StudySession } from "@/lib/supabase";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/useLocale";
import GuideOverlay from "@/components/GuideOverlay";

import { getGuestNotes } from "@/lib/guestStorage";

function getSeenNotes(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem("seen-notes") || "[]"));
  } catch { return new Set(); }
}

function markNoteSeen(id: string) {
  const seen = getSeenNotes();
  seen.add(id);
  // Keep only last 500 to avoid bloat
  const arr = [...seen].slice(-500);
  localStorage.setItem("seen-notes", JSON.stringify(arr));
}

function NotesContent() {
  const { user } = useAuth();
  const { t, locale } = useLocale();
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
  const [seenNotes, setSeenNotes] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  useEffect(() => {
    setSeenNotes(getSeenNotes());
  }, []);

  useEffect(() => {
    if (!user) {
      const guestNotes = getGuestNotes().filter((n) => n.language === filter);
      setSessions(guestNotes);
      setLoading(false);
      return;
    }
    async function load() {
      let query = supabase
        .from("study_sessions")
        .select("*")
        .order("study_date", { ascending: false })
        .order("created_at", { ascending: false });

      query = query.eq("user_id", user!.id).eq("language", filter);

      const { data } = await query;
      setSessions(data ?? []);
      setLoading(false);

      // First time: seed seen-notes with existing IDs so old notes don't show NEW
      if (data && !localStorage.getItem("seen-notes")) {
        const ids = data.map((s) => s.id);
        localStorage.setItem("seen-notes", JSON.stringify(ids));
        setSeenNotes(new Set(ids));
      }
    }
    load();
  }, [filter, user]);

  // Exit select mode when filter changes
  useEffect(() => {
    setSelectMode(false);
    setSelected(new Set());
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

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handlePointerDown(id: string) {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      if (!selectMode) {
        setSelectMode(true);
        setSelected(new Set([id]));
      }
    }, 500);
  }

  function handlePointerUp() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Reset after a tick so the current click is still blocked
    if (longPressTriggered.current) {
      setTimeout(() => { longPressTriggered.current = false; }, 0);
    }
  }

  async function handleBulkDelete() {
    setDeleting(true);
    const ids = [...selected];
    const { error } = await supabase
      .from("study_sessions")
      .delete()
      .in("id", ids);

    if (error) {
      alert(error.message);
    } else {
      setSessions((prev) => prev.filter((s) => !selected.has(s.id)));
      setSelected(new Set());
      setSelectMode(false);
    }
    setDeleting(false);
    setShowBulkDeleteConfirm(false);
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
            className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <Link
          title={locale === "ko" ? "새 노트 추가" : "Add new note"}
          data-guide="notes-add"
          href={`/add?lang=${filter}`}
          className="px-7 py-2 rounded-lg text-sm bg-primary hover:bg-primary-hover text-primary-text transition-colors shrink-0"
        >
          +
        </Link>
        <div data-guide="notes-lang" className="flex gap-1 bg-bg-card rounded-lg p-1 shrink-0">
          {(["english", "japanese"] as const).map((f) => (
            <button
              key={f}
              title={f === "english" ? (locale === "ko" ? "영어 노트 보기" : "Show English notes") : (locale === "ko" ? "일본어 노트 보기" : "Show Japanese notes")}
              onClick={() => handleFilterChange(f)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                filter === f
                  ? "bg-bg-hover text-text"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {f === "english" ? "🇺🇸" : "🇯🇵"}
            </button>
          ))}
        </div>
      </div>

      {selectMode ? (
        <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-4 h-[52px]">
          <button
            onClick={() => { setSelectMode(false); setSelected(new Set()); }}
            className="text-sm text-text-muted hover:text-text transition-colors"
          >
            {locale === "ko" ? "취소" : "Cancel"}
          </button>
          <span className="text-sm text-text-secondary font-medium">
            {locale === "ko" ? `${selected.size}개 선택` : `${selected.size} selected`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (selected.size === filtered.length) setSelected(new Set());
                else setSelected(new Set(filtered.map((s) => s.id)));
              }}
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              {selected.size === filtered.length
                ? (locale === "ko" ? "해제" : "Deselect")
                : (locale === "ko" ? "전체" : "All")}
            </button>
            <button
              onClick={() => { if (selected.size > 0) setShowBulkDeleteConfirm(true); }}
              disabled={selected.size === 0}
              className="text-sm px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-medium transition-colors"
            >
              {locale === "ko" ? "삭제" : "Delete"}
            </button>
          </div>
        </div>
      ) : !loading && filtered.length > 0 && !search.trim() && (
        <Link
          data-guide="notes-review"
          href="/review"
          className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 h-[52px] hover:bg-primary/20 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <rect x="2" y="1" width="11" height="15" rx="2" fill="currentColor" opacity={0.3} />
              <rect x="5" y="4" width="11" height="15" rx="2" fill="currentColor" opacity={0.5} />
              <rect x="8" y="7" width="11" height="15" rx="2" fill="currentColor" opacity={1} />
            </svg>
            <span className="text-sm text-primary font-medium">
              {locale === "ko" ? "카드로 복습하기" : "Review with Cards"}
            </span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/60 group-hover:translate-x-1 transition-transform">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </Link>
      )}

      <div data-guide="notes-list" className="space-y-3 flex-1" style={{ minHeight: "calc(100vh - 10rem)" }}>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-bg-hover/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            {search.trim() ? (
              <p className="text-text-faint">{t("noSearchResults")}</p>
            ) : (
              <div className="bg-bg-card border border-border rounded-2xl p-8 space-y-4 max-w-sm mx-auto">
                <div className="text-4xl">📝</div>
                <h3 className="text-base font-bold text-text">{t("noNotes")}</h3>
                <p className="text-xs text-text-muted">
                  {locale === "ko"
                    ? "학습한 표현을 기록하면 복습 카드가 자동으로 만들어집니다."
                    : "Record expressions and flashcards will be created automatically."}
                </p>
                <Link
                  href="/add"
                  className="inline-block px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-sm font-medium transition-colors"
                >
                  {t("emptyCardsCta")}
                </Link>
              </div>
            )}
          </div>
        ) : (
          filtered.map((s) => (
            <div key={s.id}>
              {selectMode ? (
                <div
                  onClick={() => toggleSelect(s.id)}
                  className={`block bg-bg-card border rounded-xl p-5 transition-colors cursor-pointer ${
                    selected.has(s.id)
                      ? "border-red-500/50 bg-red-500/10"
                      : "border-border hover:border-border-light"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.language === "english"
                        ? "bg-primary/20 text-primary"
                        : "bg-primary/20 text-primary"
                    }`}>
                      {s.language === "english" ? "English" : "日本語"}
                    </span>
                    <span className="text-sm text-text-faint">{s.study_date}</span>
                    {s.title && (
                      <span className="text-sm text-text-secondary font-medium">{s.title}</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-text-faint">
                    {s.stress_pronunciation && <span>🔊 {t("pronunciation")} ({s.stress_pronunciation.split("\n").filter(l => l.trim()).length})</span>}
                    {s.vocabulary && <span>📖 {t("vocabulary")} ({s.vocabulary.split("\n").filter(l => l.trim()).length})</span>}
                    {s.sentence_grammar && s.title !== "Nuance" && s.title !== "AI Examples" && <span>✏️ {t("grammar")} ({s.sentence_grammar.split("\n").filter(l => l.trim()).length})</span>}
                    {s.comment && <span>💬 {t("comment")}</span>}
                  </div>
                  {s.vocabulary && (
                    <p className="text-text-faint text-sm mt-2 truncate">
                      {s.vocabulary.slice(0, 120)}...
                    </p>
                  )}
                </div>
              ) : (
                <Link
                  href={`/notes/${s.id}`}
                  onClick={(e) => {
                    if (longPressTriggered.current) { e.preventDefault(); return; }
                    markNoteSeen(s.id); setSeenNotes((prev) => new Set(prev).add(s.id));
                  }}
                  onPointerDown={() => handlePointerDown(s.id)}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onContextMenu={(e) => { if (longPressTriggered.current) e.preventDefault(); }}
                  className="block bg-bg-card border border-border rounded-xl p-5 hover:border-border-light transition-colors group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.language === "english"
                        ? "bg-primary/20 text-primary"
                        : "bg-primary/20 text-primary"
                    }`}>
                      {s.language === "english" ? "English" : "日本語"}
                    </span>
                    <span className="text-sm text-text-faint">{s.study_date}</span>
                    {s.title && (
                      <span className="text-sm text-text-secondary font-medium">{s.title}</span>
                    )}
                    {!seenNotes.has(s.id) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">NEW</span>
                    )}
                  </div>

                  <div className="flex gap-4 text-xs text-text-faint">
                    {s.stress_pronunciation && <span>🔊 {t("pronunciation")} ({s.stress_pronunciation.split("\n").filter(l => l.trim()).length})</span>}
                    {s.vocabulary && <span>📖 {t("vocabulary")} ({s.vocabulary.split("\n").filter(l => l.trim()).length})</span>}
                    {s.sentence_grammar && s.title !== "Nuance" && s.title !== "AI Examples" && <span>✏️ {t("grammar")} ({s.sentence_grammar.split("\n").filter(l => l.trim()).length})</span>}
                    {s.comment && <span>💬 {t("comment")}</span>}
                  </div>

                  {s.vocabulary && (
                    <p className="text-text-faint text-sm mt-2 truncate group-hover:text-text-muted">
                      {s.vocabulary.slice(0, 120)}...
                    </p>
                  )}
                </Link>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bulk delete confirm modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border-light rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <h3 className="text-lg font-bold text-text">
              {locale === "ko" ? "노트 삭제" : "Delete Notes"}
            </h3>
            <p className="text-sm text-text-muted">
              {locale === "ko"
                ? `${selected.size}개의 노트를 삭제하시겠습니까?`
                : `Delete ${selected.size} notes?`}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-6 py-2.5 bg-bg-input hover:bg-bg-hover text-text-secondary rounded-xl text-sm transition-colors"
              >
                {locale === "ko" ? "취소" : "Cancel"}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {deleting
                  ? (locale === "ko" ? "삭제 중..." : "Deleting...")
                  : (locale === "ko" ? "삭제" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
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
