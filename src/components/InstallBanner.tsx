"use client";

import { useState, useEffect } from "react";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function getDevice(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const device = getDevice();

  useEffect(() => {
    if (isStandalone()) return;
    if (device === "other") return;
    if (sessionStorage.getItem("install-banner-dismissed")) return;
    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, [device]);

  if (!show) return null;

  function dismiss() {
    sessionStorage.setItem("install-banner-dismissed", "true");
    setShow(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-end justify-center" onClick={dismiss}>
      <div
        className="w-full max-w-lg bg-gray-900 border-t border-gray-700 rounded-t-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-white font-bold text-[15px]">
            {device === "ios"
              ? "홈 화면에 추가하면 앱처럼 사용할 수 있어요!"
              : "홈 화면에 추가하면 앱처럼 사용할 수 있어요!"}
          </h3>
          <button onClick={dismiss} className="text-gray-500 hover:text-gray-300 text-lg leading-none ml-2">✕</button>
        </div>

        {device === "ios" ? (
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold">1</span>
              <p>하단의 <span className="inline-flex items-center text-blue-400 font-medium">공유 버튼 <svg className="inline w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></span> 을 탭하세요</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold">2</span>
              <p>아래로 스크롤하여 <span className="text-white font-medium">&quot;홈 화면에 추가&quot;</span> 를 탭하세요</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold">3</span>
              <p>우측 상단 <span className="text-white font-medium">&quot;추가&quot;</span> 를 탭하면 완료!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold">1</span>
              <p>우측 상단 <span className="inline-flex items-center text-white font-medium">메뉴 <svg className="inline w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></span> 를 탭하세요</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold">2</span>
              <p><span className="text-white font-medium">&quot;홈 화면에 추가&quot;</span> 또는 <span className="text-white font-medium">&quot;앱 설치&quot;</span> 를 탭하세요</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold">3</span>
              <p><span className="text-white font-medium">&quot;설치&quot;</span> 를 탭하면 완료!</p>
            </div>
          </div>
        )}

        <button
          onClick={dismiss}
          className="mt-4 w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl text-sm transition-colors"
        >
          다음에 하기
        </button>
      </div>
    </div>
  );
}
