"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /KAKAOTALK|Instagram|FBAN|FBAV|Line|NAVER|Whale\/1|DaumApps|trill|SamsungBrowser\/\d+.*SamsungBrowser/i.test(ua)
    || (/wv\)/.test(ua) && /Android/.test(ua));
}

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [showInAppWarning, setShowInAppWarning] = useState(false);

  useEffect(() => {
    if (user) router.replace("/");
    setShowInAppWarning(isInAppBrowser());
  }, [user, router]);

  async function handleGoogleLogin() {
    if (isInAppBrowser()) {
      setShowInAppWarning(true);
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  }

  function handleOpenInBrowser() {
    const url = window.location.href;
    window.open(url, "_system");
    // Android intent fallback
    window.location.href = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;end`;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-blue-400">EN</span>
            <span className="text-gray-500">/</span>
            <span className="text-red-400">JP</span>
            <span className="text-gray-400 ml-2 text-lg font-normal">Lab</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            영어 & 일본어 학습 복습 노트
          </p>
        </div>

        {showInAppWarning ? (
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 text-sm font-medium mb-2">
                인앱 브라우저에서는 Google 로그인이 제한됩니다.
              </p>
              <p className="text-gray-400 text-xs">
                Chrome, Safari 등 외부 브라우저에서 열어주세요.
              </p>
            </div>
            <button
              onClick={handleOpenInBrowser}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-colors"
            >
              외부 브라우저로 열기
            </button>
            <p className="text-gray-600 text-xs">
              또는 주소를 복사하여 브라우저에 직접 붙여넣기 해주세요.
            </p>
          </div>
        ) : (
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 bg-white text-gray-800 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google 계정으로 로그인
          </button>
        )}
      </div>
    </div>
  );
}
