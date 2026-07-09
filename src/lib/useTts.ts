"use client";

import { useEffect, useState, useCallback } from "react";

export function useTts() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    function loadVoices() {
      setVoices(speechSynthesis.getVoices());
    }
    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const getVoice = useCallback(
    (langCode: string) => {
      const selectedName =
        langCode === "ja-JP"
          ? localStorage.getItem("tts-voice-jp") || ""
          : localStorage.getItem("tts-voice-en") || "";

      if (selectedName) {
        const v = voices.find((v) => v.name === selectedName);
        if (v) return v;
      }

      // fallback: best quality voice
      const isCompact = (name: string) => name.toLowerCase().includes("compact");
      const langVoices = voices.filter((v) => v.lang === langCode && !isCompact(v.name));
      return (
        langVoices.find((v) => /Premium|Enhanced/i.test(v.name)) ||
        langVoices.find((v) => /Siri/i.test(v.name)) ||
        langVoices[0] ||
        voices.find((v) => v.lang.startsWith(langCode.split("-")[0])) ||
        null
      );
    },
    [voices]
  );

  const speak = useCallback(
    (text: string, language: "english" | "japanese", onEnd?: () => void) => {
      speechSynthesis.cancel();
      const cleaned = text
        .replace(/[（(][^）)]*[）)]/g, "")
        .replace(/\s*\/\s*/g, ", ");
      const langCode = language === "japanese" ? "ja-JP" : "en-US";
      const utter = new SpeechSynthesisUtterance(cleaned.trim());
      utter.lang = langCode;
      const voice = getVoice(langCode);
      if (voice) utter.voice = voice;
      utter.rate = 0.9;
      if (onEnd) utter.onend = onEnd;
      speechSynthesis.speak(utter);
    },
    [getVoice]
  );

  const stop = useCallback(() => {
    speechSynthesis.cancel();
  }, []);

  return { voices, speak, stop };
}
