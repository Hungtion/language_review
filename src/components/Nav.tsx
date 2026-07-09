"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useLocale } from "@/lib/useLocale";
import { playTabClick } from "@/lib/unlockAudio";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, plan } = useAuth();
  const { t, locale } = useLocale();

  const pageTitle = pathname === "/add" ? t("addNewNote")
    : pathname === "/notes" || pathname.startsWith("/notes/") ? t("notesTitle")
    : pathname === "/review" ? t("cardTitle")
    : pathname === "/nuance" ? "Nuance Chat"
    : pathname === "/settings" ? t("settingsTitle")
    : null;

  const showBack = pathname.startsWith("/notes/");

  return (
    <nav className="border-b border-gray-800 bg-gray-950 backdrop-blur-sm sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 flex items-center h-14 gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide">
        {showBack && (
          <button onClick={() => router.back()} className="mr-1 p-1.5 text-gray-400 hover:text-gray-200 flex-shrink-0 sm:hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        <Link href="/" onClick={playTabClick} className="font-bold text-lg mr-2 sm:mr-4 tracking-tight flex-shrink-0 self-end pb-2 sm:self-center sm:pb-0">
          <span className="text-blue-400">EN</span>
          <span className="text-gray-500">/</span>
          <span className="text-red-400">JP</span>
          <span className="text-gray-400 ml-1.5 text-sm font-normal">Lab</span>
          {plan === "pro" ? (
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded font-normal">Pro</span>
          ) : user ? (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/pricing"); }} className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-gray-700/50 text-gray-400 rounded font-normal hover:bg-gray-700 transition-colors">Free</button>
          ) : null}
        </Link>
        {pageTitle && (
          <span className="ml-auto mr-3 text-sm text-gray-300 font-medium sm:hidden flex-shrink-0 self-end pb-2">{pageTitle}</span>
        )}
        {user && (
          <div className="hidden sm:flex items-center gap-0.5 sm:gap-1">
            <Link
              href="/add"
              className={`px-2 sm:px-3 py-1.5 rounded-md text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                pathname === "/add" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              {t("add")}
            </Link>
            <Link
              href="/review"
              className={`px-2 sm:px-3 py-1.5 rounded-md text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                pathname === "/review" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              {t("cards")}
            </Link>
            <Link
              href="/notes"
              className={`px-2 sm:px-3 py-1.5 rounded-md text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                pathname === "/notes" || pathname.startsWith("/notes/") ? "bg-gray-800 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              {t("notes")}
            </Link>
            <Link
              href="/nuance"
              className={`px-2 sm:px-3 py-1.5 rounded-md text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                pathname === "/nuance" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              Nuance Chat
            </Link>
            <Link
              href="/settings"
              className={`px-2 sm:px-3 py-1.5 rounded-md text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                pathname === "/settings" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              {t("settingsTitle")}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
