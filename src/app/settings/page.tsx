"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/useLocale";
import { resetTutorial, dismissTutorial, isTutorialActive } from "@/lib/guide";

function SettingsContent() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { locale, setLocale, t } = useLocale();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedEN, setSelectedEN] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("tts-voice-en") || "" : ""
  );
  const [selectedJP, setSelectedJP] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("tts-voice-jp") || "" : ""
  );
  const [autoplay, setAutoplay] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("tts-autoplay") === "true" : false
  );
  const [engChannel, setEngChannel] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("eng-channel") === "true" : false
  );
  const [tutorialOn, setTutorialOn] = useState(() =>
    typeof window !== "undefined" ? isTutorialActive() : false
  );

  useEffect(() => {
    function loadVoices() {
      setVoices(speechSynthesis.getVoices());
    }
    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  function preview(name: string, lang: "en" | "ja") {
    speechSynthesis.cancel();
    const text = lang === "en" ? "Hello, this is my voice." : "\u3053\u3093\u306b\u3061\u306f\u3001\u3053\u308c\u306f\u79c1\u306e\u58f0\u3067\u3059\u3002";
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === "en" ? "en-US" : "ja-JP";
    const voice = voices.find((v) => v.name === name);
    if (voice) utter.voice = voice;
    utter.rate = 0.9;
    speechSynthesis.speak(utter);
  }

  const enVoices = voices.filter(
    (v) => v.lang === "en-US" && !v.name.toLowerCase().includes("compact") && !v.name.toLowerCase().includes("enhanced")
  );
  const jpVoices = voices.filter(
    (v) => v.lang.startsWith("ja") && !v.name.toLowerCase().includes("compact") && !v.name.toLowerCase().includes("enhanced")
  );

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-300">{t("language")}</h2>
        <div className="flex gap-2">
          {(["en", "ko"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                locale === l
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {l === "en" ? "English" : "한국어"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
        <h2 className="text-sm font-medium text-gray-300">{t("ttsVoice")}</h2>

        <div className="space-y-2">
          <label className="text-xs text-gray-400">{t("englishUS")}</label>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-800 p-1.5 flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                setSelectedEN("");
                localStorage.setItem("tts-voice-en", "");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                selectedEN === ""
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {t("default")}
            </button>
            {enVoices.map((v) => {
              const label = v.name.replace(/^Microsoft\s+/i, "").replace(/\s+Online\s*\(Natural\)/i, "");
              return (
                <button
                  key={v.name}
                  onClick={() => {
                    setSelectedEN(v.name);
                    localStorage.setItem("tts-voice-en", v.name);
                    preview(v.name, "en");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedEN === v.name
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400">{t("japanese")}</label>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-800 p-1.5 flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                setSelectedJP("");
                localStorage.setItem("tts-voice-jp", "");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                selectedJP === ""
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {t("default")}
            </button>
            {jpVoices.map((v) => {
              const label = v.name.replace(/^Microsoft\s+/i, "").replace(/\s+Online\s*\(Natural\)/i, "");
              return (
                <button
                  key={v.name}
                  onClick={() => {
                    setSelectedJP(v.name);
                    localStorage.setItem("tts-voice-jp", v.name);
                    preview(v.name, "ja");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedJP === v.name
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-gray-600">{t("iosVoiceGuide")}</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-300">{t("autoPlay")}</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">{t("autoPlayDesc")}</span>
          <button
            onClick={() => {
              const next = !autoplay;
              localStorage.setItem("tts-autoplay", String(next));
              setAutoplay(next);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              autoplay ? "bg-indigo-600" : "bg-gray-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                autoplay ? "translate-x-[24px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-300">{t("engChannel")}</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">{t("engChannelDesc")}</span>
          <button
            onClick={() => {
              const next = !engChannel;
              localStorage.setItem("eng-channel", String(next));
              setEngChannel(next);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              engChannel ? "bg-indigo-600" : "bg-gray-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                engChannel ? "translate-x-[24px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-300">{locale === "ko" ? "설명 가이드" : "Guide Tutorial"}</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">{locale === "ko" ? "각 화면의 설명을 표시합니다" : "Show guide on each screen"}</span>
          <button
            onClick={() => {
              if (tutorialOn) {
                dismissTutorial();
                setTutorialOn(false);
              } else {
                resetTutorial();
                setTutorialOn(true);
              }
            }}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              tutorialOn ? "bg-indigo-600" : "bg-gray-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                tutorialOn ? "translate-x-[24px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-300">{t("account")}</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">{user?.email}</p>
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            {t("logout")}
          </button>
        </div>
        <div className="pt-2 border-t border-gray-800">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors"
          >
            {locale === "ko" ? "회원 탈퇴" : "Delete Account"}
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <h3 className="text-lg font-bold text-white">
              {locale === "ko" ? "정말 탈퇴하시겠습니까?" : "Delete your account?"}
            </h3>
            <p className="text-sm text-gray-400 whitespace-pre-line">
              {locale === "ko"
                ? "모든 노트, 복습 카드, 채팅 기록이 삭제되며\n복구할 수 없습니다."
                : "All notes, flashcards, and chat history will be permanently deleted.\nThis cannot be undone."}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
              >
                {locale === "ko" ? "취소" : "Cancel"}
              </button>
              <button
                onClick={async () => {
                  if (!user) return;
                  setDeleting(true);
                  try {
                    const res = await fetch("/api/account/delete", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: user.id }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      await signOut();
                      router.push("/login");
                    } else {
                      alert(data.error || "Failed to delete account");
                    }
                  } catch {
                    alert("Failed to delete account");
                  }
                  setDeleting(false);
                  setShowDeleteConfirm(false);
                }}
                disabled={deleting}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {deleting
                  ? (locale === "ko" ? "처리 중..." : "Deleting...")
                  : (locale === "ko" ? "탈퇴하기" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsContent />
    </RequireAuth>
  );
}
