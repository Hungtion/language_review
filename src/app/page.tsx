"use client";

import { useEffect, useState, useRef } from "react";
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

const FALLBACK_QUOTES = {
  english: [
    "The limits of my language mean the limits of my world. — Wittgenstein",
    "To have another language is to possess a second soul. — Charlemagne",
    "Mistakes are proof that you are trying.",
    "A different language is a different vision of life. — Federico Fellini",
    "One word at a time, one day at a time.",
  ],
  japanese: [
    "千里の道も一歩から。— 老子",
    "継続は力なり。",
    "失敗は成功のもと。",
    "習うより慣れろ。",
    "一期一会。",
  ],
};

function getFallbackQuote(lang: "english" | "japanese"): string {
  const list = FALLBACK_QUOTES[lang];
  const day = Math.floor(Date.now() / 86400000);
  return list[day % list.length];
}

function HomeContent() {
  const router = useRouter();
  const { user, loading, credits } = useAuth();
  const { t, locale } = useLocale();
  const isKo = locale === "ko";

  useEffect(() => {
    if (loading) return;
    if (!user && !sessionStorage.getItem("browsing")) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const [allNotes, setAllNotes] = useState<StudySession[]>([]);
  const [counts, setCounts] = useState({ english: 0, japanese: 0 });
  const [cardCounts, setCardCounts] = useState({ all: 0, english: 0, japanese: 0 });
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [streak, setStreak] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [dailyQuote, setDailyQuote] = useState("");
  const [dailyTranslation, setDailyTranslation] = useState("");
  const [langFilter, setLangFilter] = useState<"english" | "japanese">(() => {
    if (typeof window === "undefined") return "english";
    return (localStorage.getItem("lang-filter") as "english" | "japanese") || "english";
  });

  useEffect(() => {
    if (!user) {
      const gn = getGuestNotes();
      setAllNotes(gn);
      setCounts({
        english: gn.filter((n) => n.language === "english").length,
        japanese: gn.filter((n) => n.language === "japanese").length,
      });
      let allC = 0, enC = 0, jpC = 0;
      for (const n of gn) {
        const v = n.vocabulary ? parseVocabulary(n.vocabulary).length : 0;
        const s = n.sentence_grammar ? parseSentences(n.sentence_grammar).length : 0;
        allC += v + s;
        if (n.language === "english") enC += v + s;
        else jpC += v + s;
      }
      setCardCounts({ all: allC, english: enC, japanese: jpC });
      setDataLoading(false);
      return;
    }
    async function load() {
      const [notesRes, activityData] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("*")
          .eq("user_id", user!.id)
          .order("study_date", { ascending: false })
          .order("created_at", { ascending: false }),
        getActivityCalendar(user!.id),
      ]);

      const notes = notesRes.data || [];
      setAllNotes(notes);
      setCounts({
        english: notes.filter((n) => n.language === "english").length,
        japanese: notes.filter((n) => n.language === "japanese").length,
      });

      let allC = 0, enC = 0, jpC = 0;
      for (const n of notes) {
        const v = n.vocabulary ? parseVocabulary(n.vocabulary).length : 0;
        const s = n.sentence_grammar ? parseSentences(n.sentence_grammar).length : 0;
        allC += v + s;
        if (n.language === "english") enC += v + s;
        else jpC += v + s;
      }
      setCardCounts({ all: allC, english: enC, japanese: jpC });

      setActivities(activityData);
      setStreak(calculateStreak(activityData));
      setDataLoading(false);
    }
    load();
  }, [user]);

  const quoteCacheRef = useRef<Record<string, { quote: string; translation: string }>>({});

  useEffect(() => {
    // Already fetched this session
    if (quoteCacheRef.current[langFilter]) {
      const c = quoteCacheRef.current[langFilter];
      setDailyQuote(c.quote);
      setDailyTranslation(c.translation);
      return;
    }

    let cancelled = false;
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `daily-quote-v2-${langFilter}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.date === today) {
          quoteCacheRef.current[langFilter] = { quote: parsed.quote, translation: parsed.translation || "" };
          setDailyQuote(parsed.quote);
          setDailyTranslation(parsed.translation || "");
          return;
        }
      } catch {}
    }

    setDailyQuote(getFallbackQuote(langFilter));
    setDailyTranslation("");
    fetch(`/api/daily-quote?lang=${langFilter}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const quote = data.quote || getFallbackQuote(langFilter);
        quoteCacheRef.current[langFilter] = { quote, translation: data.translation || "" };
        setDailyQuote(quote);
        setDailyTranslation(data.translation || "");
        if (data.quote) {
          localStorage.setItem(cacheKey, JSON.stringify({ date: today, quote: data.quote, translation: data.translation || "" }));
        }
      })
      .catch(() => {
        if (!cancelled) setDailyQuote(getFallbackQuote(langFilter));
      });
    return () => { cancelled = true; };
  }, [langFilter]);

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
          {(() => {
            const name = user?.user_metadata?.full_name || user?.user_metadata?.name || "";
            const greeting = langFilter === "japanese" ? "ようこそ!" : "Hello!";
            return name ? `${greeting} ${name}` : greeting;
          })()}
        </h1>
        <div
          className="mt-1 cursor-pointer active:opacity-70 transition-opacity h-[3.5rem] overflow-hidden"
          style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
          onClick={async () => {
            if (!user) return;
            const quote = dailyQuote || getFallbackQuote(langFilter);
            const entry = dailyTranslation ? `${quote}|||${dailyTranslation}` : quote;
            const { data: existing } = await supabase
              .from("study_sessions")
              .select("id, sentence_grammar")
              .eq("user_id", user.id)
              .eq("title", "Quotes")
              .eq("language", langFilter)
              .single();
            if (existing) {
              const current = existing.sentence_grammar || "";
              if (!current.includes(quote)) {
                await supabase.from("study_sessions").update({
                  sentence_grammar: current ? current + "\n" + entry : entry,
                  study_date: new Date().toISOString().split("T")[0],
                }).eq("id", existing.id);
              }
            } else {
              await supabase.from("study_sessions").insert({
                user_id: user.id,
                language: langFilter,
                study_date: new Date().toISOString().split("T")[0],
                title: "Quotes",
                sentence_grammar: entry,
                raw_input: quote,
              });
            }
            router.push("/review?startIndex=0");
          }}
        >
          <span className="text-text-muted text-sm italic">{dailyQuote || "\u00A0"}</span>
        </div>
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
          {/* Language toggle */}
          <div className="flex gap-1 bg-bg-input rounded-lg p-1">
            {([
              { key: "english" as const, label: "English" },
              { key: "japanese" as const, label: "日本語" },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setLangFilter(tab.key);
                  localStorage.setItem("lang-filter", tab.key);
                }}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  langFilter === tab.key
                    ? "bg-bg-card text-primary shadow-sm"
                    : "text-text-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Stats grid */}
          <div data-guide="stats" className="grid grid-cols-2 gap-3">
            <Link
              href="/notes"
              className="bg-bg-card border border-border rounded-xl p-4 text-center hover:border-border-light transition-colors"
            >
              <div className="text-2xl font-bold text-text">{counts[langFilter]}</div>
              <div className="text-xs text-text-faint mt-0.5">{isKo ? "노트" : "Notes"}</div>
            </Link>
            <Link
              href="/review"
              className="bg-bg-card border border-border rounded-xl p-4 text-center hover:border-border-light transition-colors"
            >
              <div className="text-2xl font-bold text-primary">{cardCounts[langFilter]}</div>
              <div className="text-xs text-text-faint mt-0.5">{t("todayReviewCount")}</div>
            </Link>
            <Link
              href="/add"
              className="bg-bg-card border border-border rounded-xl p-4 text-center hover:border-border-light transition-colors"
            >
              <div className="text-2xl font-bold text-text">+</div>
              <div className="text-xs text-text-faint mt-0.5">{t("addNote")}</div>
            </Link>
            <Link
              href="/pricing"
              className="bg-bg-card border border-border rounded-xl p-4 text-center hover:border-border-light transition-colors"
            >
              <div className="text-2xl font-bold text-green-500">{credits === 0 ? "🍃" : credits <= 10 ? "🌱" : credits <= 50 ? "🌿" : "🌳"} {credits}</div>
              <div className="text-xs text-text-faint mt-0.5">Leaf</div>
            </Link>
          </div>

          {/* Recent Notes */}
          {allNotes.length > 0 && (
            <div data-guide="recent-notes">
              <h2 className="text-base font-semibold mb-2">{t("recentNotes")}</h2>
              <div className="space-y-2">
                {allNotes
                  .filter((s) => s.language === langFilter)
                  .slice(0, 3)
                  .map((s) => (
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

          {/* Activity Calendar */}
          {user && <ActivityCalendar activities={activities} streak={streak} />}
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
