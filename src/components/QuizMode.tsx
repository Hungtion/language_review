"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocale } from "@/lib/useLocale";

type Card = {
  front: string;
  back: string;
  type: "vocab" | "sentence";
  language: "english" | "japanese";
  sessionId?: string;
};

type QuizQuestion = {
  qType: "meaning-to-word" | "word-to-meaning" | "translate";
  question: string;
  answer: string;
  choices?: string[];
  card: Card;
};

type QuizResult = {
  question: QuizQuestion;
  userAnswer: string;
  correct: boolean;
  aiChecked?: boolean;
  aiScore?: number;
  aiFeedback?: string;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[。、！？!?,.\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function generateQuestions(cards: Card[], count: number): QuizQuestion[] {
  const vocabCards = cards.filter(c => c.type === "vocab" && c.back);
  const sentCards = cards.filter(c => c.type === "sentence" && c.back);
  const questions: QuizQuestion[] = [];

  // Vocab cards → multiple choice (need at least 4 for choices)
  if (vocabCards.length >= 4) {
    const shuffledVocab = shuffle(vocabCards);
    for (const card of shuffledVocab) {
      if (questions.length >= count) break;
      const qType = Math.random() < 0.5 ? "meaning-to-word" : "word-to-meaning";

      // Pick 3 wrong answers from other vocab cards
      const others = vocabCards.filter(c => c.front !== card.front);
      const wrongCards = shuffle(others).slice(0, 3);

      if (qType === "meaning-to-word") {
        const choices = shuffle([card.front, ...wrongCards.map(c => c.front)]);
        questions.push({ qType, question: card.back, answer: card.front, choices, card });
      } else {
        const choices = shuffle([card.back, ...wrongCards.map(c => c.back)]);
        questions.push({ qType, question: card.front, answer: card.back, choices, card });
      }
    }
  }

  // Sentence cards → translate (typing)
  if (sentCards.length > 0) {
    const shuffledSent = shuffle(sentCards);
    for (const card of shuffledSent) {
      if (questions.length >= count) break;
      questions.push({
        qType: "translate",
        question: card.back,
        answer: card.front,
        card,
      });
    }
  }

  // If not enough questions yet, add more vocab as translate
  if (questions.length < count && vocabCards.length > 0 && vocabCards.length < 4) {
    for (const card of shuffle(vocabCards)) {
      if (questions.length >= count) break;
      questions.push({
        qType: "translate",
        question: card.back,
        answer: card.front,
        card,
      });
    }
  }

  return shuffle(questions).slice(0, count);
}

export default function QuizMode({ cards, noteId, onExit }: { cards: Card[]; noteId?: string | null; onExit?: () => void }) {
  const { locale } = useLocale();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [aiChecking, setAiChecking] = useState(false);
  const [finished, setFinished] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const count = noteId ? cards.length : Math.min(10, cards.length);
    const qs = generateQuestions(cards, count);
    setQuestions(qs);
    setCurrentIdx(0);
    setResults([]);
    setSelectedChoice(null);
    setTypedAnswer("");
    setShowAnswer(false);
    setFinished(false);
  }, [cards, noteId]);

  const current = questions[currentIdx];

  const saveWrongCard = useCallback((card: Card) => {
    try {
      const existing = JSON.parse(localStorage.getItem("wrong-cards") || "[]");
      const idx = existing.findIndex((c: Card & { wrongCount?: number }) => c.front === card.front && c.language === card.language);
      if (idx >= 0) {
        existing[idx].wrongCount = (existing[idx].wrongCount || 1) + 1;
      } else {
        existing.push({ ...card, wrongCount: 1 });
      }
      localStorage.setItem("wrong-cards", JSON.stringify(existing));
    } catch {}
  }, []);

  const removeWrongCard = useCallback((card: Card) => {
    try {
      const existing = JSON.parse(localStorage.getItem("wrong-cards") || "[]");
      const filtered = existing.filter((c: Card) => !(c.front === card.front && c.language === card.language));
      localStorage.setItem("wrong-cards", JSON.stringify(filtered));
    } catch {}
  }, []);

  const checkTranslation = useCallback(async (userAnswer: string, correctAnswer: string): Promise<{ correct: boolean; score?: number; feedback?: string }> => {
    // Step 1: simple normalized comparison
    if (normalize(userAnswer) === normalize(correctAnswer)) return { correct: true, score: 100, feedback: "완벽한 답변!" };

    // Step 2: AI scoring
    try {
      setAiChecking(true);
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quiz-check",
          userAnswer,
          correctAnswer,
          question: current?.question,
        }),
      });
      const data = await res.json();
      const score = data.result?.score ?? 0;
      const feedback = data.result?.feedback || "";
      return { correct: score >= 70, score, feedback };
    } catch {
      return { correct: false, score: 0, feedback: "채점 실패" };
    } finally {
      setAiChecking(false);
    }
  }, [current]);

  const handleChoiceSelect = useCallback((choice: string) => {
    if (showAnswer) return;
    setSelectedChoice(choice);
    setShowAnswer(true);
    const correct = choice === current.answer;
    if (correct) removeWrongCard(current.card);
    else saveWrongCard(current.card);
    setResults(prev => [...prev, { question: current, userAnswer: choice, correct }]);
  }, [showAnswer, current, saveWrongCard, removeWrongCard]);

  const handleTranslateSubmit = useCallback(async () => {
    if (showAnswer || aiChecking || !typedAnswer.trim()) return;
    const result = await checkTranslation(typedAnswer.trim(), current.answer);
    if (result.correct) removeWrongCard(current.card);
    else saveWrongCard(current.card);
    setResults(prev => [...prev, { question: current, userAnswer: typedAnswer.trim(), correct: result.correct, aiChecked: true, aiScore: result.score, aiFeedback: result.feedback }]);
    setShowAnswer(true);
  }, [showAnswer, aiChecking, typedAnswer, current, checkTranslation, saveWrongCard, removeWrongCard]);

  const handleNext = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIdx(prev => prev + 1);
      setSelectedChoice(null);
      setTypedAnswer("");
      setShowAnswer(false);
      setHint(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIdx, questions.length]);

  const handleRestart = useCallback(() => {
    const count = noteId ? cards.length : Math.min(10, cards.length);
    const qs = generateQuestions(cards, count);
    setQuestions(qs);
    setCurrentIdx(0);
    setResults([]);
    setSelectedChoice(null);
    setTypedAnswer("");
    setShowAnswer(false);
    setFinished(false);
  }, [cards, noteId]);

  const fetchHint = useCallback(async () => {
    if (hint || hintLoading || !current) return;
    setHintLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quiz-hint",
          question: current.question,
          answer: current.answer,
          language: current.card.language,
        }),
      });
      const data = await res.json();
      setHint(data.result || (locale === "ko" ? "힌트를 불러올 수 없습니다." : "Could not load hint."));
    } catch {
      setHint(locale === "ko" ? "힌트를 불러올 수 없습니다." : "Could not load hint.");
    } finally {
      setHintLoading(false);
    }
  }, [hint, hintLoading, current, locale]);

  if (questions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-text-muted text-sm">
            {locale === "ko" ? "퀴즈를 만들 카드가 부족합니다." : "Not enough cards for a quiz."}
          </p>
          <p className="text-text-faint text-xs">
            {locale === "ko" ? "카드에 앞면/뒷면이 모두 있어야 합니다." : "Cards need both front and back."}
          </p>
        </div>
      </div>
    );
  }

  // Results screen
  if (finished) {
    const correctCount = results.filter(r => r.correct).length;
    const total = results.length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-6">
          {total === 0 ? (
            <div className="text-center text-text-muted text-sm">
              {locale === "ko" ? "풀은 문제가 없습니다." : "No questions answered."}
            </div>
          ) : (
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold">{correctCount}/{total}</div>
            <div className="text-lg text-text-muted">{pct}%</div>
            <div className="text-sm text-text-faint">
              {pct >= 90 ? (locale === "ko" ? "완벽해요!" : "Perfect!") :
               pct >= 70 ? (locale === "ko" ? "잘했어요!" : "Great job!") :
               pct >= 50 ? (locale === "ko" ? "조금만 더!" : "Keep going!") :
               (locale === "ko" ? "복습이 필요해요" : "Needs more review")}
            </div>
          </div>
          )}

          {/* Wrong answers review */}
          {results.filter(r => !r.correct).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-red-400">{locale === "ko" ? "틀린 문제" : "Incorrect"}</h3>
              {results.filter(r => !r.correct).map((r, i) => (
                <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2 text-text-faint">
                    <span>Q: {r.question.question}</span>
                    {r.aiScore != null && <span className="text-xs text-orange-400">{r.aiScore}점</span>}
                  </div>
                  <div className="text-red-400">
                    {locale === "ko" ? "내 답" : "Your answer"}: {r.userAnswer}
                  </div>
                  <div className="text-green-400">
                    {locale === "ko" ? "정답" : "Correct"}: {r.question.answer}
                  </div>
                  {r.aiFeedback && <div className="text-text-faint text-xs">{r.aiFeedback}</div>}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleRestart}
              className="flex-1 py-3 bg-primary hover:bg-primary-hover rounded-xl text-sm font-medium transition-colors"
            >
              {locale === "ko" ? "다시 풀기" : "Try Again"}
            </button>
            {onExit && (
              <button
                onClick={onExit}
                className="flex-1 py-3 bg-bg-card border border-border hover:border-primary/50 rounded-xl text-sm font-medium transition-colors text-text-muted"
              >
                {locale === "ko" ? "나가기" : "Exit"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="flex-1 flex flex-col px-4">
      {/* Progress - fixed at top */}
      <div className="flex items-center gap-3 pt-2 pb-4">
        <div className="flex-1 h-1.5 bg-bg-hover rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${((currentIdx) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-text-faint shrink-0">{currentIdx + 1}/{questions.length}</span>
        <button
          onClick={() => setFinished(true)}
          className="text-xs text-text-faint hover:text-red-400 transition-colors shrink-0"
        >
          {locale === "ko" ? "그만하기" : "Quit"}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg space-y-6">
        {/* Question */}
        <div className="bg-bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-lg font-medium leading-relaxed">{current.question}</p>
        </div>

        {/* Multiple choice */}
        {current.choices ? (
          <div className="grid grid-cols-1 gap-2">
            {current.choices.map((choice, i) => {
              let style = "bg-bg-card border border-border hover:border-primary/50 text-text";
              if (showAnswer) {
                if (choice === current.answer) {
                  style = "bg-green-500/20 border border-green-500/50 text-green-400";
                } else if (choice === selectedChoice && choice !== current.answer) {
                  style = "bg-red-500/20 border border-red-500/50 text-red-400";
                } else {
                  style = "bg-bg-card border border-border text-text-faint opacity-50";
                }
              }
              return (
                <button
                  key={i}
                  onClick={() => handleChoiceSelect(choice)}
                  disabled={showAnswer}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${style}`}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        ) : (
          /* Translation input */
          <div className="space-y-3">
            <textarea
              ref={inputRef}
              value={typedAnswer}
              onChange={(e) => {
                setTypedAnswer(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTranslateSubmit(); } }}
              disabled={showAnswer}
              rows={1}
              placeholder={locale === "ko" ? "답을 입력하세요..." : "Type your answer..."}
              className="w-full bg-bg-card border border-border rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none overflow-hidden"
              autoFocus
            />
            {!showAnswer && (
              <button
                onClick={handleTranslateSubmit}
                disabled={!typedAnswer.trim() || aiChecking}
                className="w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-bg-hover disabled:text-text-faint rounded-xl text-sm font-medium transition-colors"
              >
                {aiChecking ? (locale === "ko" ? "채점 중..." : "Checking...") : (locale === "ko" ? "제출" : "Submit")}
              </button>
            )}
            {showAnswer && (() => {
              const lastResult = results[results.length - 1];
              const score = lastResult?.aiScore;
              const isExactMatch = lastResult?.correct && !lastResult?.aiChecked;
              const scoreColor = score != null
                ? score >= 90 ? "text-green-400" : score >= 70 ? "text-yellow-400" : score >= 40 ? "text-orange-400" : "text-red-400"
                : "";
              const bgStyle = score != null
                ? score >= 90 ? "bg-green-500/10 border border-green-500/30"
                  : score >= 70 ? "bg-yellow-500/10 border border-yellow-500/30"
                  : "bg-red-500/10 border border-red-500/30"
                : lastResult?.correct
                  ? "bg-green-500/10 border border-green-500/30"
                  : "bg-red-500/10 border border-red-500/30";
              return (
              <div className={`rounded-xl p-4 text-sm space-y-1.5 ${bgStyle}`}>
                {isExactMatch ? (
                  <div className="text-green-400 font-medium">{locale === "ko" ? "정답!" : "Correct!"}</div>
                ) : score != null ? (
                  <>
                    <div className={`font-medium ${scoreColor}`}>AI {locale === "ko" ? "채점" : "Score"}: {score}{locale === "ko" ? "점" : ""}</div>
                    {lastResult?.aiFeedback && (
                      <div className="text-text-faint text-xs">{lastResult.aiFeedback}</div>
                    )}
                  </>
                ) : (
                  <div className="text-red-400 font-medium">{locale === "ko" ? "오답" : "Incorrect"}</div>
                )}
                {!isExactMatch && (
                  <div className="text-text-muted">
                    {locale === "ko" ? "정답" : "Answer"}: <span className="text-green-400">{current.answer}</span>
                  </div>
                )}
              </div>
              );
            })()}
          </div>
        )}

        {/* Hint button */}
        {!showAnswer && current.qType === "translate" && (
          <div className="text-center">
            <button
              onClick={fetchHint}
              disabled={hintLoading}
              className="text-xs text-text-faint hover:text-primary transition-colors underline"
            >
              {hintLoading ? (locale === "ko" ? "힌트 로딩..." : "Loading hint...") : (locale === "ko" ? "힌트 보기" : "Show hint")}
            </button>
            {hint && (
              <div className="mt-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 text-xs text-primary">
                {hint}
              </div>
            )}
          </div>
        )}

        {/* Next button */}
        {showAnswer && (
          <button
            onClick={handleNext}
            className="w-full py-3 bg-bg-card border border-border hover:border-primary/50 rounded-xl text-sm transition-colors"
          >
            {currentIdx + 1 >= questions.length
              ? (locale === "ko" ? "결과 보기" : "See Results")
              : (locale === "ko" ? "다음 문제" : "Next")}
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
