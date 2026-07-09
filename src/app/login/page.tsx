"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/useLocale";

type InAppType = "kakaotalk" | "android-inapp" | "ios-inapp" | null;

function detectInApp(): InAppType {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";

  // 카카오톡 (iOS/Android 모두 전용 스킴 사용 가능)
  if (/KAKAOTALK/i.test(ua)) return "kakaotalk";

  // 인스타/페북은 intent도 안 먹히므로 안내 UI로 통일
  if (/Instagram|FBAN|FBAV/i.test(ua)) return "ios-inapp";

  // 안드로이드 인앱 브라우저 (라인, 네이버 등)
  if (/Android/i.test(ua) && /Line|NAVER|DaumApps|trill/i.test(ua)) return "android-inapp";
  if (/wv\)/.test(ua) && /Android/.test(ua)) return "android-inapp";

  // iOS 인앱 브라우저 (라인, 네이버 등)
  if (/iPhone|iPad/i.test(ua) && /Line|NAVER/i.test(ua)) return "ios-inapp";

  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { locale, setLocale, t } = useLocale();
  const [inAppType, setInAppType] = useState<InAppType>(null);

  useEffect(() => {
    if (user && !user.is_anonymous) {
      router.replace(redirect);
      return;
    }

    const type = detectInApp();
    setInAppType(type);

    // 자동 탈출: 카카오톡은 전용 스킴으로 바로 외부 브라우저 열기
    if (type === "kakaotalk") {
      const targetUrl = encodeURIComponent(window.location.href);
      window.location.href = `kakaotalk://web/openExternal?url=${targetUrl}`;
      return;
    }

    // 자동 탈출: 안드로이드 인앱은 intent로 Chrome 열기
    if (type === "android-inapp") {
      const url = window.location.href.replace(/https?:\/\//i, "");
      window.location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`;
    }
  }, [user, router]);

  async function handleGoogleLogin() {
    if (inAppType) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + redirect,
      },
    });
  }

  async function handleKakaoLogin() {
    if (inAppType) return;
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: window.location.origin + redirect,
      },
    });
  }

  function handleCopyUrl() {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        alert(t("urlCopied"));
      });
    } else {
      prompt(t("copyPrompt"), url);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          {(["ko", "en"] as const).map((l) => (
            <button
              key={l}
              title={l === "ko" ? "한국어로 전환" : "Switch to English"}
              onClick={() => setLocale(l)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                locale === l ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {l === "ko" ? "🇰🇷" : "🇺🇸"}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-blue-400">EN</span>
            <span className="text-gray-500">/</span>
            <span className="text-red-400">JP</span>
            <span className="text-gray-400 ml-2 text-lg font-normal">Lab</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {t("langLabDesc")}
          </p>
        </div>

        {inAppType === "kakaotalk" || inAppType === "android-inapp" ? (
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 text-sm font-medium mb-2">
                {t("redirectingBrowser")}
              </p>
              <p className="text-gray-400 text-xs">
                {t("autoRedirectFail")}
              </p>
            </div>
            <button
              onClick={() => {
                if (inAppType === "kakaotalk") {
                  const targetUrl = encodeURIComponent(window.location.href);
                  window.location.href = `kakaotalk://web/openExternal?url=${targetUrl}`;
                } else {
                  const url = window.location.href.replace(/https?:\/\//i, "");
                  window.location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`;
                }
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-colors"
            >
              {t("openInBrowser")}
            </button>
          </div>
        ) : inAppType === "ios-inapp" ? (
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 text-sm font-medium mb-2">
                {t("inAppRestricted")}
              </p>
              <p className="text-gray-400 text-xs leading-relaxed">
                {t("tapMenu")} <span className="text-gray-300 font-medium">⋯</span> {t("menuAbove")}<br />
                <span className="text-gray-300 font-medium">&quot;{t("openDefault")}&quot;</span>.
              </p>
            </div>
            <button
              onClick={handleCopyUrl}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-colors"
            >
              {t("copyUrl")}
            </button>
            <p className="text-gray-600 text-xs">
              {t("orPasteSafari")}
            </p>
          </div>
        ) : (
          <div className="space-y-3 w-full">
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
              {t("signInWithGoogle")}
            </button>
            <button
              onClick={handleKakaoLogin}
              className="w-full flex items-center justify-center gap-3 py-3 bg-[#FEE500] text-[#191919] rounded-lg font-medium text-sm hover:bg-[#FDD835] transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#191919" d="M12 3C6.48 3 2 6.44 2 10.65c0 2.68 1.78 5.05 4.48 6.42-.15.54-.97 3.5-.99 3.7 0 0-.02.17.09.23.11.07.24.01.24.01.32-.04 3.7-2.44 4.28-2.86.6.09 1.23.13 1.9.13 5.52 0 10-3.44 10-7.65S17.52 3 12 3z"/>
              </svg>
              {t("signInWithKakao")}
            </button>
            <button
              onClick={() => { sessionStorage.setItem("browsing", "1"); router.push("/"); }}
              className="mx-auto flex flex-col items-center justify-center h-[44px] px-6 rounded-lg border border-gray-800 hover:border-gray-600 transition-colors"
            >
              <span className="text-sm text-gray-400 leading-none">{locale === "ko" ? "먼저 둘러보기" : "Browse first"}</span>
              <span className="text-[10px] text-yellow-600/80 leading-none mt-1">{locale === "ko" ? "데이터가 저장되지 않습니다" : "Data will not be saved"}</span>
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
