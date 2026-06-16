"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

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
  const [inAppType, setInAppType] = useState<InAppType>(null);

  useEffect(() => {
    if (user) {
      router.replace("/");
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
        redirectTo: window.location.origin,
      },
    });
  }

  function handleCopyUrl() {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        alert("주소가 복사되었습니다.\nSafari를 열고 붙여넣기 해주세요.");
      });
    } else {
      prompt("아래 주소를 복사하여 Safari에서 열어주세요:", url);
    }
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

        {inAppType === "kakaotalk" || inAppType === "android-inapp" ? (
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 text-sm font-medium mb-2">
                외부 브라우저로 이동 중...
              </p>
              <p className="text-gray-400 text-xs">
                자동으로 전환되지 않으면 아래 버튼을 눌러주세요.
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
              외부 브라우저로 열기
            </button>
          </div>
        ) : inAppType === "ios-inapp" ? (
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 text-sm font-medium mb-2">
                인앱 브라우저에서는 Google 로그인이 제한됩니다.
              </p>
              <p className="text-gray-400 text-xs leading-relaxed">
                상단의 <span className="text-gray-300 font-medium">⋯</span> 메뉴에서<br />
                <span className="text-gray-300 font-medium">&quot;기본 브라우저에서 열기&quot;</span>를 선택해주세요.
              </p>
            </div>
            <button
              onClick={handleCopyUrl}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-colors"
            >
              주소 복사하기
            </button>
            <p className="text-gray-600 text-xs">
              또는 복사 후 Safari에 붙여넣기 해주세요.
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
