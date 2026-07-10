"use client";

import { useState, useEffect, useRef } from "react";

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

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function getDismissCount(): number {
  try { return parseInt(localStorage.getItem("install-dismiss-count") || "0", 10); } catch { return 0; }
}

export default function InstallBanner() {
  const [showModal, setShowModal] = useState(false);
  const [showMini, setShowMini] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const device = getDevice();
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (device === "other") return;

    const dismissCount = getDismissCount();
    // Stop showing after 3 dismissals
    if (dismissCount >= 3) return;

    if (device === "android") {
      const handler = (e: Event) => {
        e.preventDefault();
        deferredPrompt.current = e as BeforeInstallPromptEvent;
      };
      window.addEventListener("beforeinstallprompt", handler);

      const timer = setTimeout(() => setShowModal(true), 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    const timer = setTimeout(() => setShowModal(true), 2000);
    return () => clearTimeout(timer);
  }, [device]);

  if (!showModal && !showMini) return null;

  function dismissModal() {
    const count = getDismissCount() + 1;
    localStorage.setItem("install-dismiss-count", String(count));
    setShowModal(false);
    // Show mini banner after dismissing modal (up to 3 times)
    if (count < 3) setShowMini(true);
  }

  function dismissAll() {
    localStorage.setItem("install-dismiss-count", "3");
    setShowModal(false);
    setShowMini(false);
  }

  async function handleAndroidInstall() {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      deferredPrompt.current = null;
      if (outcome === "accepted") {
        dismissAll();
      }
    } else {
      setShowManual(true);
    }
  }

  // Mini banner (slim bar at bottom)
  if (!showModal && showMini) {
    return (
      <div className="fixed bottom-16 left-0 right-0 z-[9998] flex justify-center px-4 animate-slide-up">
        <div className="w-full max-w-lg bg-bg-input border border-border-light rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg">
          <span className="text-sm text-text-secondary flex-1">
            홈 화면에 추가하면 앱처럼!
          </span>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-primary-text rounded-lg text-xs font-medium transition-colors shrink-0"
          >
            {device === "android" ? "설치" : "방법 보기"}
          </button>
          <button
            onClick={() => setShowMini(false)}
            className="text-text-faint hover:text-text-secondary text-sm leading-none shrink-0"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Full modal
  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-end justify-center" onClick={dismissModal}>
      <div
        className="w-full max-w-lg bg-bg-card border-t border-border-light rounded-t-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-text font-bold text-[15px]">
            홈 화면에 추가하면 앱처럼 사용할 수 있어요!
          </h3>
          <button onClick={dismissModal} className="text-text-faint hover:text-text-secondary text-lg leading-none ml-2">✕</button>
        </div>

        {device === "ios" ? (
          <div className="space-y-3 text-sm text-text-secondary">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/30 text-primary flex items-center justify-center text-xs font-bold">1</span>
              <p>하단의 <span className="inline-flex items-center text-primary font-medium">공유 버튼 <svg className="inline w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></span> 을 탭하세요</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/30 text-primary flex items-center justify-center text-xs font-bold">2</span>
              <p>아래로 스크롤하여 <span className="text-text font-medium">&quot;홈 화면에 추가&quot;</span> 를 탭하세요</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/30 text-primary flex items-center justify-center text-xs font-bold">3</span>
              <p>우측 상단 <span className="text-text font-medium">&quot;추가&quot;</span> 를 탭하면 완료!</p>
            </div>
          </div>
        ) : showManual ? (
          <div className="space-y-3 text-sm text-text-secondary">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/30 text-primary flex items-center justify-center text-xs font-bold">1</span>
              <p>우측 상단 <span className="inline-flex items-center text-text font-medium">메뉴 <svg className="inline w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></span> 를 탭하세요</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/30 text-primary flex items-center justify-center text-xs font-bold">2</span>
              <p><span className="text-text font-medium">&quot;홈 화면에 추가&quot;</span> 또는 <span className="text-text font-medium">&quot;앱 설치&quot;</span> 를 탭하세요</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/30 text-primary flex items-center justify-center text-xs font-bold">3</span>
              <p><span className="text-text font-medium">&quot;설치&quot;</span> 를 탭하면 완료!</p>
            </div>
          </div>
        ) : (
          <div className="text-sm text-text-secondary">
            <p className="mb-4">앱을 설치하면 더 빠르고 편하게 사용할 수 있어요.</p>
            <button
              onClick={handleAndroidInstall}
              className="w-full py-3 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-sm font-medium transition-colors"
            >
              홈 화면에 추가
            </button>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={dismissModal}
            className="flex-1 py-2.5 bg-bg-input hover:bg-bg-hover text-text-muted rounded-xl text-sm transition-colors"
          >
            다음에 하기
          </button>
          <button
            onClick={dismissAll}
            className="py-2.5 px-4 text-text-faint hover:text-text-muted text-xs transition-colors"
          >
            다시 보지 않기
          </button>
        </div>
      </div>
    </div>
  );
}
