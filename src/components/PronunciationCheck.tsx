"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocale } from "@/lib/useLocale";

export type PronResult = {
  transcript: string;
  score: number;
  matches: { word: string; matched: boolean }[];
};

type Props = {
  targetText: string;
  language: "english" | "japanese";
  onResult?: (result: PronResult | null) => void;
  onListeningChange?: (listening: boolean) => void;
};

type Result = PronResult;

function stripParens(text: string): string {
  return text.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^\w\u3000-\u9fff\uff00-\uffef]/g, "");
}

function computeScore(target: string, spoken: string): Result {
  const cleaned = stripParens(target);
  const originalWords = cleaned.split(" ").filter(Boolean);
  const spokenWords = new Set(spoken.split(" ").filter(Boolean).map(normalizeWord));

  let matched = 0;
  const matches = originalWords.map((word) => {
    const isMatch = spokenWords.has(normalizeWord(word));
    if (isMatch) matched++;
    return { word, matched: isMatch };
  });

  const score = originalWords.length > 0 ? Math.round((matched / originalWords.length) * 100) : 0;
  return { transcript: spoken, score, matches };
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-yellow-500";
  return "text-red-400";
}

function getScoreLabel(score: number, isKo: boolean): string {
  if (score >= 90) return isKo ? "완벽해요!" : "Perfect!";
  if (score >= 70) return isKo ? "잘했어요!" : "Great!";
  if (score >= 50) return isKo ? "괜찮아요" : "Good try";
  return isKo ? "다시 해볼까요?" : "Try again";
}

export default function PronunciationCheck({ targetText, language, onResult, onListeningChange }: Props) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastTranscriptRef = useRef<string>("");

  useEffect(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setResult(null);
    setListening(false);
    onListeningChange?.(false);
    onResult?.(null);
  }, [targetText]);

  const supported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(() => {
    if (!supported) return;

    setResult(null);
    onResult?.(null);
    lastTranscriptRef.current = "";
    setListening(true);
    onListeningChange?.(true);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = language === "japanese" ? "ja-JP" : "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript;
      lastTranscriptRef.current = transcript;
      if (last.isFinal) {
        const r = computeScore(targetText, transcript);
        setResult(r);
        onResult?.(r);
        setListening(false);
        onListeningChange?.(false);
      }
    };

    recognition.onerror = () => {
      setListening(false);
      onListeningChange?.(false);
    };

    recognition.onend = () => {
      setListening(false);
      onListeningChange?.(false);
    };

    recognition.start();
  }, [supported, targetText, language]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    onListeningChange?.(false);
    // Evaluate with whatever was captured so far
    if (lastTranscriptRef.current) {
      const r = computeScore(targetText, lastTranscriptRef.current);
      setResult(r);
      onResult?.(r);
    }
  }, [targetText, onResult, onListeningChange]);

  if (!supported) return null;

  return (
    <div className="w-full max-w-lg">
      <div className="flex items-center justify-center gap-3">
        {listening ? (
          <button
            key="stop"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              stopListening();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            {isKo ? "듣는 중..." : "Listening..."}
          </button>
        ) : (
          <button
            key="start"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              startListening();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-bg-card border border-border text-text-muted hover:text-text hover:border-border-light"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            {isKo ? "소리내어 읽기" : "Read Aloud"}
          </button>
        )}

      </div>
    </div>
  );
}
