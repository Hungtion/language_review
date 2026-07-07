"use client";

import { useState, useEffect } from "react";
import RequireAuth from "@/components/RequireAuth";
import { useLocale } from "@/lib/useLocale";

function SettingsContent() {
  const { locale, setLocale, t } = useLocale();
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
    (v) => v.lang === "en-US" && !v.name.toLowerCase().includes("compact")
  );
  const jpVoices = voices.filter(
    (v) => v.lang.startsWith("ja") && !v.name.toLowerCase().includes("compact")
  );

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">{t("settingsTitle")}</h1>

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
