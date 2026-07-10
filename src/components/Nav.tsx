"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useLocale } from "@/lib/useLocale";
import { playTabClick } from "@/lib/unlockAudio";
import { GUIDE_STEPS } from "@/lib/guide";

const GUIDE_PAGES: Record<string, string> = {
  "/": "home",
  "/add": "add",
  "/review": "review",
  "/notes": "notes",
  "/nuance": "nuance",
  "/settings": "settings",
  "/notes/[id]": "note-detail",
};

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, credits } = useAuth();
  const { t, locale } = useLocale();

  const guideKey = GUIDE_PAGES[pathname] || (/^\/notes\/.+/.test(pathname) ? "note-detail" : undefined);
  const hasGuide = guideKey && GUIDE_STEPS[guideKey]?.length > 0;
  const [guideActive, setGuideActive] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => setGuideActive((e as CustomEvent).detail);
    window.addEventListener("guide-visible", handler);
    return () => window.removeEventListener("guide-visible", handler);
  }, []);

  const pageTitle = pathname === "/add" ? t("addNewNote")
    : pathname === "/notes" || pathname.startsWith("/notes/") ? t("notesTitle")
    : pathname === "/review" ? t("cardTitle")
    : pathname === "/nuance" ? "Nuance Chat"
    : pathname === "/settings" ? t("settingsTitle")
    : null;

  return (
    <nav className="border-b border-border bg-bg-nav backdrop-blur-sm sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 flex items-center h-14 gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide">
        <Link href="/" onClick={playTabClick} className="font-bold text-lg mr-2 sm:mr-4 tracking-tight flex-shrink-0">
          <span className="text-primary">Language</span>
          <span className="text-text-muted ml-1 text-sm font-normal">LAB</span>
          {user && !user.is_anonymous ? (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/pricing"); }} className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded font-normal hover:bg-primary/30 transition-colors">
              <span className="text-sm">{credits === 0 ? "🍃" : credits < 10 ? "🌱" : credits < 50 ? "🌿" : "🌳"}</span>{credits}
            </button>
          ) : null}
        </Link>
        <div className="ml-auto flex items-center gap-1 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-0.5 sm:gap-1">
            <Link
              href="/add"
              className={`px-2 sm:px-3 py-1.5 rounded-md text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                pathname === "/add" ? "bg-bg-input text-text" : "text-text-muted hover:text-text hover:bg-bg-input/50"
              }`}
            >
              {t("add")}
            </Link>
            <Link
              href="/review"
              className={`px-2 sm:px-3 py-1.5 rounded-md text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                pathname === "/review" ? "bg-bg-input text-text" : "text-text-muted hover:text-text hover:bg-bg-input/50"
              }`}
            >
              {t("cards")}
            </Link>
            <Link
              href="/notes"
              className={`px-2 sm:px-3 py-1.5 rounded-md text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                pathname === "/notes" || pathname.startsWith("/notes/") ? "bg-bg-input text-text" : "text-text-muted hover:text-text hover:bg-bg-input/50"
              }`}
            >
              {t("notes")}
            </Link>
            <Link
              href="/nuance"
              className={`px-2 sm:px-3 py-1.5 rounded-md text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                pathname === "/nuance" ? "bg-bg-input text-text" : "text-text-muted hover:text-text hover:bg-bg-input/50"
              }`}
            >
              Nuance Chat
            </Link>
            <Link
              href="/settings"
              className={`px-2 sm:px-3 py-1.5 rounded-md text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                pathname === "/settings" ? "bg-bg-input text-text" : "text-text-muted hover:text-text hover:bg-bg-input/50"
              }`}
            >
              {t("settingsTitle")}
            </Link>
          </div>
          {pageTitle && (
            <span className="mr-1 text-sm text-text-secondary font-medium sm:hidden">{pageTitle}</span>
          )}
          {hasGuide && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("show-guide"))}
              title={locale === "ko" ? "도움말" : "Help"}
              className={`sm:ml-auto p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                guideActive
                  ? "text-primary animate-pulse"
                  : "text-text-faint hover:text-primary hover:bg-bg-input/50"
              }`}
              style={guideActive ? {
                filter: "drop-shadow(0 0 6px var(--primary)) drop-shadow(0 0 12px var(--primary))",
              } : undefined}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
