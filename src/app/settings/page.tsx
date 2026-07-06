"use client";

import { useState, useEffect } from "react";
import RequireAuth from "@/components/RequireAuth";

function SettingsContent() {
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
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-300">TTS Voice</h2>

        <div className="space-y-2">
          <label className="text-xs text-gray-400">English (US)</label>
          <select
            value={selectedEN}
            onChange={(e) => {
              setSelectedEN(e.target.value);
              localStorage.setItem("tts-voice-en", e.target.value);
              if (e.target.value) preview(e.target.value, "en");
            }}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-indigo-500"
          >
            <option value="">Default</option>
            {enVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400">Japanese</label>
          <select
            value={selectedJP}
            onChange={(e) => {
              setSelectedJP(e.target.value);
              localStorage.setItem("tts-voice-jp", e.target.value);
              if (e.target.value) preview(e.target.value, "ja");
            }}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-indigo-500"
          >
            <option value="">Default</option>
            {jpVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-gray-600">
          iOS: Settings &gt; Accessibility &gt; Spoken Content &gt; Voices
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-300">Auto Play</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">카드 넘길 때 자동 재생</span>
          <button
            onClick={() => {
              const next = localStorage.getItem("tts-autoplay") === "true" ? "false" : "true";
              localStorage.setItem("tts-autoplay", next);
              setAutoplay(next === "true");
            }}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              autoplay ? "bg-indigo-600" : "bg-gray-700"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                autoplay ? "translate-x-6" : "translate-x-0.5"
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
