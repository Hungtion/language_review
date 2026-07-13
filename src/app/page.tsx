"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, StudySession } from "@/lib/supabase";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/useLocale";
import GuideOverlay from "@/components/GuideOverlay";
import { getGuestNotes } from "@/lib/guestStorage";
import { SkeletonHome } from "@/components/Skeleton";
import ActivityCalendar from "@/components/ActivityCalendar";
import { getActivityCalendar, calculateStreak, type DailyActivity } from "@/lib/streak";
import { parseVocabulary, parseSentences } from "@/lib/parser";

function HomeContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t, locale } = useLocale();
  const isKo = locale === "ko";

  useEffect(() => {
    if (loading) return;
    if (!user && !sessionStorage.getItem("browsing")) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const [recent, setRecent] = useState<StudySession[]>([]);
  const [counts, setCounts] = useState({ english: 0, japanese: 0 });
  const [cardCount, setCardCount] = useState(0);
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [streak, setStreak] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      const gn = getGuestNotes();
      setRecent(gn.slice(0, 5));
      setCounts({
        english: gn.filter((n) => n.language === "english").length,
        japanese: gn.filter((n) => n.language === "japanese").length,
      });
      // Count cards from guest notes
      let cards = 0;
      for (const n of gn) {
        if (n.vocabulary) cards += parseVocabulary(n.vocabulary).length;
        if (n.sentence_grammar) cards += parseSentences(n.sentence_grammar).length;
      }
      setCardCount(cards);
      setDataLoading(false);
      return;
    }
    async function load() {
      const [recentRes, engRes, jpnRes, allNotesRes, activityData] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("*")
          .eq("user_id", user!.id)
          .order("study_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("study_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("language", "english"),
        supabase
          .from("study_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("language", "japanese"),
        supabase
          .from("study_sessions")
          .select("vocabulary, sentence_grammar")
          .eq("user_id", user!.id),
        getActivityCalendar(user!.id),
      ]);

      if (recentRes.data) setRecent(recentRes.data);
      setCounts({ english: engRes.count ?? 0, japanese: jpnRes.count ?? 0 });

      // Count total cards
      let cards = 0;
      for (const n of allNotesRes.data || []) {
        if (n.vocabulary) cards += parseVocabulary(n.vocabulary).length;
        if (n.sentence_grammar) cards += parseSentences(n.sentence_grammar).length;
      }
      setCardCount(cards);

      setActivities(activityData);
      setStreak(calculateStreak(activityData));
      setDataLoading(false);
    }
    load();
  }, [user]);

  if (dataLoading) {
    return <SkeletonHome />;
  }

  const totalNotes = counts.english + counts.japanese;
  const isEmpty = totalNotes === 0;

  return (
    <div className="space-y-6">
      <GuideOverlay pageKey="home" />

      {/* Header */}
      <div className="pt-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {isKo ? "안녕하세요!" : "Hello!"}
          {streak > 0 && (
            <span className="ml-2 text-orange-400 text-lg font-bold">
              🔥 {streak}{isKo ? "일" : "d"}
            </span>
          )}
        </h1>
        <p className="text-text-muted text-sm mt-1">{t("langLabDesc")}</p>
      </div>

      {isEmpty ? (
        /* Empty State - Onboarding */
        <div className="bg-bg-card border border-border rounded-2xl p-8 text-center space-y-6">
          <div className="text-4xl">🌱</div>
          <div>
            <h2 className="text-lg font-bold text-text">{t("emptyHomeTitle")}</h2>
            <p className="text-text-muted text-sm mt-1">{t("emptyHomeDesc")}</p>
          </div>

          <div className="flex flex-col gap-3 max-w-xs mx-auto text-left">
            {[
              { step: "1", icon: "✏️", text: t("emptyStep1") },
              { step: "2", icon: "🃏", text: t("emptyStep2") },
              { step: "3", icon: "💬", text: t("emptyStep3") },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {s.step}
                </span>
                <span className="text-sm text-text-secondary">
                  {s.icon} {s.text}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/add"
            className="inline-block px-6 py-3 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-sm font-medium transition-colors"
          >
            {t("emptyHomeCta")}
          </Link>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div data-guide="stats" className="grid grid-cols-2 gap-3">
            <Link
              href="/notes?filter=english"
              className="bg-bg-card border border-border rounded-xl p-4 hover:border-border-light transition-colors text-center"
            >
              <div className="text-primary text-xs font-medium">English</div>
              <div className="text-2xl font-bold mt-0.5">{counts.english}</div>
              <div className="text-[10px] text-text-faint mt-0.5">{isKo ? "노트" : "notes"}</div>
            </Link>
            <Link
              href="/notes?filter=japanese"
              className="bg-bg-card border border-border rounded-xl p-4 hover:border-border-light transition-colors text-center"
            >
              <div className="text-primary text-xs font-medium">日本語</div>
              <div className="text-2xl font-bold mt-0.5">{counts.japanese}</div>
              <div className="text-[10px] text-text-faint mt-0.5">{isKo ? "노트" : "notes"}</div>
            </Link>
          </div>

          {/* Today's status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-primary">{cardCount}</div>
              <div className="text-xs text-text-faint mt-0.5">{t("todayReviewCount")}</div>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{streak > 0 ? `🔥 ${streak}` : "—"}</div>
              <div className="text-xs text-text-faint mt-0.5">{isKo ? "연속 학습" : "streak"}</div>
            </div>
          </div>

          {/* Activity Calendar */}
          {user && <ActivityCalendar activities={activities} streak={streak} />}

          {/* Quick Actions */}
          <div data-guide="quick-actions" className="grid grid-cols-2 gap-3">
            <Link
              href="/review"
              className="bg-primary hover:bg-primary-hover text-primary-text rounded-xl p-4 text-center transition-colors"
            >
              <div className="flex justify-center mb-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="1" width="11" height="15" rx="2" fill="currentColor" opacity={0.3} />
                  <rect x="5" y="4" width="11" height="15" rx="2" fill="currentColor" opacity={0.5} />
                  <rect x="8" y="7" width="11" height="15" rx="2" fill="currentColor" opacity={1} />
                </svg>
              </div>
              <div className="text-sm font-medium">{t("reviewCards")}</div>
            </Link>
            <Link
              href="/add"
              className="bg-bg-input hover:bg-bg-hover text-text rounded-xl p-4 text-center transition-colors"
            >
              <div className="text-xl mb-1">+</div>
              <div className="text-sm font-medium">{t("addNote")}</div>
            </Link>
          </div>

          {/* Recent Notes */}
          {recent.length > 0 && (
            <div data-guide="recent-notes">
              <h2 className="text-base font-semibold mb-2">{t("recentNotes")}</h2>
              <div className="space-y-2">
                {recent.map((s) => (
                  <Link
                    key={s.id}
                    href={`/notes/${s.id}`}
                    className="block bg-bg-card border border-border rounded-lg p-3 hover:border-border-light transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                        {s.language === "english" ? "EN" : "JP"}
                      </span>
                      <span className="text-xs text-text-muted">{s.study_date}</span>
                      {s.title && <span className="text-xs text-text-secondary truncate">{s.title}</span>}
                    </div>
                    {s.vocabulary && (
                      <p className="text-text-faint text-xs mt-1 truncate">{s.vocabulary.slice(0, 100)}</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
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
