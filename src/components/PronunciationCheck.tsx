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
};

type Result = PronResult;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u3000-\u9fff\uff00-\uffef]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function computeScore(target: string, spoken: string): Result {
  const targetNorm = normalize(target);
  const spokenNorm = normalize(spoken);

  const targetWords = targetNorm.split(" ").filter(Boolean);
  const spokenWords = new Set(spokenNorm.split(" ").filter(Boolean));

  let matched = 0;
  const matches = targetWords.map((word) => {
    const isMatch = spokenWords.has(word);
    if (isMatch) matched++;
    return { word, matched: isMatch };
  });

  const score = targetWords.length > 0 ? Math.round((matched / targetWords.length) * 100) : 0;
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

export default function PronunciationCheck({ targetText, language, onResult }: Props) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setResult(null);
    setListening(false);
    onResult?.(null);
  }, [targetText]);

  const supported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(() => {
    if (!supported) return;

    setResult(null);
    onResult?.(null);
    setListening(true);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = language === "japanese" ? "ja-JP" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      const r = computeScore(targetText, transcript);
      setResult(r);
      onResult?.(r);
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  }, [supported, targetText, language]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

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

        {result && (
          <span className={`text-lg font-bold ${getScoreColor(result.score)}`}>
            {result.score}% <span className="text-xs font-normal">{getScoreLabel(result.score, isKo)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
