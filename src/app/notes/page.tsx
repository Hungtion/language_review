"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase, StudySession } from "@/lib/supabase";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/useLocale";
import GuideOverlay from "@/components/GuideOverlay";
import { toast } from "@/components/Toast";

import { getGuestNotes } from "@/lib/guestStorage";
import { parseVocabulary, parseSentences } from "@/lib/parser";

function getSeenNotes(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem("seen-notes") || "[]"));
  } catch { return new Set(); }
}

function markNoteSeen(id: string) {
  const seen = getSeenNotes();
  seen.add(id);
  const arr = [...seen].slice(-500);
  localStorage.setItem("seen-notes", JSON.stringify(arr));
}

function getPinnedNotes(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem("pinned-notes") || "[]"));
  } catch { return new Set(); }
}

function savePinnedNotes(pinned: Set<string>) {
  localStorage.setItem("pinned-notes", JSON.stringify([...pinned]));
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
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [pinnedNoteIds, setPinnedNoteIds] = useState<Set<string>>(new Set());
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const swipeCurrentX = useRef(0);
  const swipingId = useRef<string | null>(null);
  const swipeAxis = useRef<"none" | "horizontal" | "vertical">("none");
  const swipeElMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const swipeActionMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const swipePinMap = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    setSeenNotes(getSeenNotes());
    setPinnedNoteIds(getPinnedNotes());
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

  useEffect(() => {
    setSwipedId(null);
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

  async function handleShare(id: string) {
    const note = sessions.find((s) => s.id === id);
    if (!note) return;
    if (!note.shared) {
      await supabase.from("study_sessions").update({ shared: true }).eq("id", id);
      setSessions((prev) => prev.map((s) => s.id === id ? { ...s, shared: true } : s));
    }
    const url = `${window.location.origin}/share/${id}`;
    if (navigator.share) {
      navigator.share({ title: note.title || "Shared Note", url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      toast(locale === "ko" ? "공유 링크가 복사되었습니다!" : "Share link copied!", "success");
    }
    resetSwipe(id);
  }

  function resetSwipe(id: string) {
    const el = swipeElMap.current.get(id);
    const actionEl = swipeActionMap.current.get(id);
    const pinEl = swipePinMap.current.get(id);
    const t = "all 0.2s ease";
    if (el) { el.style.transition = t; el.style.transform = "translateX(0)"; }
    if (actionEl) { actionEl.style.transition = t; actionEl.style.width = "0px"; }
    if (pinEl) { pinEl.style.transition = t; pinEl.style.width = "0px"; }
    setSwipedId(null);
    setSwipeDir(null);
  }

  const swipeBaseOffset = useRef(0);

  function handleTouchStart(id: string, e: React.TouchEvent) {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    swipeCurrentX.current = e.touches[0].clientX;
    swipingId.current = id;
    swipeAxis.current = "none";
    // Remember current offset so reverse swipe works from open state
    if (swipedId === id && swipeDir === "left") swipeBaseOffset.current = -144;
    else if (swipedId === id && swipeDir === "right") swipeBaseOffset.current = 72;
    else swipeBaseOffset.current = 0;
    if (swipedId && swipedId !== id) resetSwipe(swipedId);
  }

  function handleTouchMoveNative(id: string, e: TouchEvent) {
    if (swipingId.current !== id) return;
    const cx = e.touches[0].clientX;
    const cy = e.touches[0].clientY;
    // Determine axis on first significant movement
    if (swipeAxis.current === "none") {
      const dx = Math.abs(cx - swipeStartX.current);
      const dy = Math.abs(cy - swipeStartY.current);
      if (dx < 5 && dy < 5) return;
      swipeAxis.current = dx >= dy ? "horizontal" : "vertical";
    }
    if (swipeAxis.current === "vertical") return;
    e.preventDefault(); // lock vertical scroll during horizontal swipe
    swipeCurrentX.current = cx;
    const rawDx = swipeStartX.current - swipeCurrentX.current;
    const totalOffset = swipeBaseOffset.current - rawDx;
    const clamped = Math.max(-150, Math.min(80, totalOffset));
    const el = swipeElMap.current.get(id);
    const actionEl = swipeActionMap.current.get(id);
    const pinEl = swipePinMap.current.get(id);
    if (el) {
      el.style.transform = `translateX(${clamped}px)`;
      el.style.transition = "none";
      if (clamped < -20) setSwipeDir("left");
      else if (clamped > 20) setSwipeDir("right");
    }
    if (actionEl) {
      actionEl.style.width = `${Math.max(0, -clamped)}px`;
      actionEl.style.transition = "none";
    }
    if (pinEl) {
      pinEl.style.width = `${Math.max(0, clamped)}px`;
      pinEl.style.transition = "none";
    }
  }

  function handleTouchEnd(id: string) {
    if (swipingId.current !== id) return;
    const rawDx = swipeStartX.current - swipeCurrentX.current;
    const totalOffset = swipeBaseOffset.current - rawDx;
    const el = swipeElMap.current.get(id);
    const actionEl = swipeActionMap.current.get(id);
    const pinEl = swipePinMap.current.get(id);
    const t = "all 0.2s ease";
    if (el) {
      el.style.transition = t;
      if (actionEl) actionEl.style.transition = t;
      if (pinEl) pinEl.style.transition = t;
      if (totalOffset < -50) {
        el.style.transform = "translateX(-144px)";
        if (actionEl) actionEl.style.width = "144px";
        if (pinEl) pinEl.style.width = "0px";
        setSwipedId(id);
        setSwipeDir("left");
      } else if (totalOffset > 50) {
        el.style.transform = "translateX(72px)";
        if (pinEl) pinEl.style.width = "72px";
        if (actionEl) actionEl.style.width = "0px";
        setSwipedId(id);
        setSwipeDir("right");
      } else {
        el.style.transform = "translateX(0)";
        if (actionEl) actionEl.style.width = "0px";
        if (pinEl) pinEl.style.width = "0px";
        setSwipedId(null);
        setSwipeDir(null);
      }
    }
    swipingId.current = null;
  }

  function togglePin(id: string) {
    setPinnedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // Count pinned notes in current language filter
        const pinnedInLang = filtered.filter((s) => next.has(s.id)).length;
        if (pinnedInLang >= 3) {
          toast(locale === "ko" ? "고정은 언어별 최대 3개까지 가능합니다" : "You can pin up to 3 notes per language", "info");
          return prev;
        }
        next.add(id);
      }
      savePinnedNotes(next);
      return next;
    });
    resetSwipe(id);
  }

  async function handleSwipeDelete(id: string) {
    const { error } = await supabase
      .from("study_sessions")
      .delete()
      .eq("id", id);
    if (!error) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setSwipedId(null);
      setSwipeDir(null);
      setDeleteConfirmId(null);
    }
  }

  const PINNED_TITLES = ["Daily Quotes", "Nuance", "LAB Examples"];
  const pinnedNotes = sessions.filter((s) => PINNED_TITLES.includes(s.title || ""));
  const regularSessions = sessions.filter((s) => !PINNED_TITLES.includes(s.title || ""));

  const filteredUnsorted = search.trim()
    ? regularSessions.filter((s) => {
        const q = search.toLowerCase();
        return (
          (s.title && s.title.toLowerCase().includes(q)) ||
          (s.stress_pronunciation && s.stress_pronunciation.toLowerCase().includes(q)) ||
          (s.vocabulary && s.vocabulary.toLowerCase().includes(q)) ||
          (s.sentence_grammar && s.sentence_grammar.toLowerCase().includes(q)) ||
          (s.comment && s.comment.toLowerCase().includes(q))
        );
      })
    : regularSessions;

  // Pinned notes first, then rest in original order
  const filtered = [
    ...filteredUnsorted.filter((s) => pinnedNoteIds.has(s.id)),
    ...filteredUnsorted.filter((s) => !pinnedNoteIds.has(s.id)),
  ];

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

      {!loading && filtered.length > 0 && !search.trim() && (
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

      {/* Pinned notes */}
      {pinnedNotes.length > 0 && !search.trim() && (
        <div data-guide="notes-pinned" className="grid grid-cols-3 gap-2">
          {PINNED_TITLES.map((title) => {
            const note = pinnedNotes.find((n) => n.title === title);
            if (!note) return null;
            const count = (note.sentence_grammar || "").split("\n").filter((l) => l.trim()).length;
            const icon = title === "Daily Quotes" ? "📜" : title === "Nuance" ? "🗣️" : "🧪";
            const label = title === "LAB Examples" ? "LAB Example" : title;
            return (
              <Link
                key={title}
                href={`/notes/${note.id}`}
                onClick={() => { markNoteSeen(note.id); setSeenNotes((prev) => new Set(prev).add(note.id)); }}
                className="bg-bg-card border border-border rounded-lg px-3 py-2.5 text-center hover:border-border-light transition-colors"
              >
                <div className="text-lg">{icon}</div>
                <div className="text-[11px] font-medium text-text mt-0.5">{label}</div>
                <div className="text-[10px] text-text-faint">{count}</div>
              </Link>
            );
          })}
        </div>
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
              <Link
                href={`/notes/${s.id}`}
                onClick={(e) => {
                  if (swipedId === s.id) { e.preventDefault(); resetSwipe(s.id); return; }
                  markNoteSeen(s.id); setSeenNotes((prev) => new Set(prev).add(s.id));
                }}
                className="relative block bg-bg-card border border-border rounded-xl overflow-hidden hover:border-border-light transition-colors group"
              >
                {/* Right action: share + delete (iOS-style unfold) */}
                <div
                  ref={(el) => { if (el) swipeActionMap.current.set(s.id, el); }}
                  className="absolute right-0 top-0 bottom-0 flex overflow-hidden"
                  style={{ width: 0 }}
                >
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare(s.id); }}
                    className="flex-1 flex items-center justify-center text-white bg-blue-500 h-full min-w-0"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirmId(s.id); }}
                    className="flex-1 flex items-center justify-center text-white bg-red-600 h-full min-w-0"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
                {/* Left action: pin (iOS-style unfold) */}
                <div
                  ref={(el) => { if (el) swipePinMap.current.set(s.id, el); }}
                  className="absolute left-0 top-0 bottom-0 flex items-center justify-center bg-yellow-500 overflow-hidden"
                  style={{ width: 0 }}
                >
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePin(s.id); }}
                    className="text-white p-2"
                  >
                    {pinnedNoteIds.has(s.id) ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="2" y1="2" x2="22" y2="22" />
                        <path d="M12 17v5" /><path d="M9 9v1.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V5a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 17v5" /><path d="M9 10.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v5.76z" />
                      </svg>
                    )}
                  </button>
                </div>
                {/* Slideable content */}
                <div
                  ref={(el) => {
                    if (!el) return;
                    swipeElMap.current.set(s.id, el);
                    // Native non-passive listener for preventDefault
                    el.ontouchstart = (e) => handleTouchStart(s.id, e as unknown as React.TouchEvent);
                    el.ontouchmove = (e) => handleTouchMoveNative(s.id, e);
                    el.ontouchend = () => handleTouchEnd(s.id);
                  }}
                  className="relative p-5 bg-bg-card"
                  style={{
                    transform: swipedId === s.id ? (swipeDir === "left" ? "translateX(-144px)" : "translateX(72px)") : "translateX(0)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {pinnedNoteIds.has(s.id) && (
                      <span className="text-[10px]">📌</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-primary/20 text-primary`}>
                      {s.language === "english" ? "English" : "日本語"}
                    </span>
                    <span className="text-sm text-text-faint">{s.study_date?.slice(2).replace(/-/g, ".")}</span>
                    {s.title && (
                      <span className="text-sm text-text-secondary font-medium">{s.title}</span>
                    )}
                    {!seenNotes.has(s.id) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">NEW</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-text-faint">
                    {s.stress_pronunciation && <span>🔊 {t("pronunciation")} ({s.stress_pronunciation.split("\n").filter(l => l.trim()).length})</span>}
                    {s.vocabulary && <span>📖 {t("vocabulary")} ({parseVocabulary(s.vocabulary).length})</span>}
                    {s.sentence_grammar && s.title !== "Nuance" && s.title !== "LAB Examples" && <span>✏️ {t("grammar")} ({parseSentences(s.sentence_grammar).length})</span>}
                    {s.comment && <span>💬 {t("comment")}</span>}
                  </div>
                </div>
                {/* PC: hover action buttons */}
                <div className="absolute top-3 right-3 hidden sm:group-hover:flex items-center gap-1">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePin(s.id); }}
                    className="p-1.5 text-text-faint hover:text-yellow-500 transition-colors"
                    title={pinnedNoteIds.has(s.id) ? (locale === "ko" ? "고정 해제" : "Unpin") : (locale === "ko" ? "고정" : "Pin")}
                  >
                    {pinnedNoteIds.has(s.id) ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="2" y1="2" x2="22" y2="22" />
                        <path d="M12 17v5" /><path d="M9 9v1.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V5a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 17v5" /><path d="M9 10.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v5.76z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare(s.id); }}
                    className="p-1.5 text-text-faint hover:text-blue-400 transition-colors"
                    title={locale === "ko" ? "공유하기" : "Share"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirmId(s.id); }}
                    className="p-1.5 text-text-faint hover:text-red-400 transition-colors"
                    title={locale === "ko" ? "삭제" : "Delete"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
              </Link>
            </div>
          ))
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border-light rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <h3 className="text-lg font-bold text-text">
              {locale === "ko" ? "노트 삭제" : "Delete Note"}
            </h3>
            <p className="text-sm text-text-muted">
              {locale === "ko" ? "이 노트를 삭제하시겠습니까?" : "Delete this note?"}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => { setDeleteConfirmId(null); setSwipedId(null); const el = swipeElMap.current.get(deleteConfirmId); if (el) { el.style.transition = "transform 0.2s ease"; el.style.transform = "translateX(0)"; } }}
                className="px-6 py-2.5 bg-bg-input hover:bg-bg-hover text-text-secondary rounded-xl text-sm transition-colors"
              >
                {locale === "ko" ? "취소" : "Cancel"}
              </button>
              <button
                onClick={() => handleSwipeDelete(deleteConfirmId)}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors"
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

export default function NotesPage() {
  return (
    <RequireAuth>
      <NotesContent />
    </RequireAuth>
  );
}
