"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { playTabClick } from "@/lib/unlockAudio";
import { useUploadStatus, clearNotesBadge } from "@/lib/uploadStatus";

export default function BottomTab() {
  const pathname = usePathname();
  const { status: uploadStatus, notesBadge } = useUploadStatus();

  const tabs = [
    { href: "/", icon: HomeIcon, label: "홈", match: (p: string) => p === "/", guideLabel: "홈", desc: "Dashboard" },
    { href: "/add", icon: AddIcon, label: "추가", match: (p: string) => p === "/add", guideLabel: "새 노트", desc: "Add Note" },
    { href: "/review", icon: CardsIcon, label: "카드", match: (p: string) => p === "/review", guideLabel: "복습\n카드", desc: "Review Cards" },
    { href: "/notes", icon: NotesIcon, label: "노트", match: (p: string) => p === "/notes" || p.startsWith("/notes/"), guideLabel: "노트\n목록", desc: "Note List" },
    { href: "/nuance", icon: NuanceIcon, label: "튜터", match: (p: string) => p === "/nuance", guideLabel: "Nuance\nChat", desc: "Nuance Chat" },
    { href: "/settings", icon: SettingsIcon, label: "설정", match: (p: string) => p === "/settings", guideLabel: "설정", desc: "Settings" },
  ];

  return (
    <nav data-guide="bottom-tab" className="sm:hidden fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-sm border-t border-gray-800 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ href, icon: Icon, label, match, guideLabel, desc }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              title={desc}
              onClick={() => { playTabClick(); if (href === "/notes") clearNotesBadge(); }}
              data-guide-tab={guideLabel}
              className={`relative flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-lg transition-colors ${
                active ? "text-indigo-400" : "text-gray-500"
              }`}
            >
              <Icon active={active} />
              <span className={`text-[10px] leading-none ${active ? "text-indigo-400 font-medium" : "text-gray-500"}`}>{label}</span>
              {href === "/add" && uploadStatus === "uploading" && (
                <>
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-400 rounded-full animate-ping" />
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-400 rounded-full" />
                </>
              )}
              {href === "/add" && uploadStatus === "done" && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-400 rounded-full" />
              )}
              {href === "/notes" && notesBadge && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-400 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function AddIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CardsIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="1" width="11" height="15" rx="2" fill="currentColor" opacity={0.3} />
      <rect x="5" y="4" width="11" height="15" rx="2" fill="currentColor" opacity={0.5} />
      <rect x="8" y="7" width="11" height="15" rx="2" fill="currentColor" opacity={1} />
    </svg>
  );
}

function NotesIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function NuanceIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
