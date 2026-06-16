"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function Nav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const links = [
    { href: "/", label: "홈" },
    { href: "/add", label: "입력" },
    { href: "/review", label: "복습 카드" },
    { href: "/notes", label: "전체 노트" },
  ];

  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 flex items-center h-14 gap-1">
        <Link href="/" className="font-bold text-lg mr-6 tracking-tight">
          <span className="text-blue-400">EN</span>
          <span className="text-gray-500">/</span>
          <span className="text-red-400">JP</span>
          <span className="text-gray-400 ml-1.5 text-sm font-normal">Lab</span>
        </Link>
        {user && links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              pathname === l.href
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
            }`}
          >
            {l.label}
          </Link>
        ))}
        {user && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:inline">{user.email}</span>
            <button
              onClick={signOut}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
