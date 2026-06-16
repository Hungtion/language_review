"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { parseRawInput } from "@/lib/parser";

const SAMPLE_EN = `Stress and Pronunciation
quote- kwoht
qu= kw

Vocabulary
ledger (noun) = a written or digital record of transactions by a company

to fluctuate (verb) = to go up and down ; to change constantly/continually

--> The stock market fluctuates a lot

speculative (adjective) = based on guesses or ideas of what might happen rather than facts or proof

iffy (adjective) = uncertain ; unclear ; unknown

Sentence Structure & Grammar
I was drinking a lot and not getting enough sleep.

Same as usual.

It had been a while since we last got together / We got together for the first time in a while

The alcohol was cheaper there compared to other restaurants

I didn't feel like drinking / I wasn't in the mood to drink

I felt like I was getting sick

Comment
1,003,374,736,000 won = one trillion .... won`;

export default function AddPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<"english" | "japanese">("english");
  const [rawInput, setRawInput] = useState("");
  const [title, setTitle] = useState("");
  const [studyDate, setStudyDate] = useState(new Date().toISOString().split("T")[0]);
  const [preview, setPreview] = useState<ReturnType<typeof parseRawInput> | null>(null);
  const [saving, setSaving] = useState(false);

  function handlePreview() {
    const parsed = parseRawInput(rawInput);
    setPreview(parsed);
  }

  async function handleSave() {
    if (!rawInput.trim()) return;
    setSaving(true);

    const parsed = parseRawInput(rawInput);

    const { error } = await supabase.from("study_sessions").insert({
      language,
      study_date: studyDate,
      title: title || null,
      stress_pronunciation: parsed.stress_pronunciation,
      vocabulary: parsed.vocabulary,
      sentence_grammar: parsed.sentence_grammar,
      comment: parsed.comment,
      raw_input: rawInput,
    });

    setSaving(false);

    if (error) {
      alert("저장 실패: " + error.message);
    } else {
      router.push("/notes");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">새 학습 노트 입력</h1>

      {/* Language & Date */}
      <div className="flex gap-4 items-end">
        <div className="flex gap-2">
          <button
            onClick={() => setLanguage("english")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              language === "english"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage("japanese")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              language === "japanese"
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            日本語
          </button>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">학습일</label>
          <input
            type="date"
            value={studyDate}
            onChange={(e) => setStudyDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">제목 (선택)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: Lesson 12 - Business English"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Raw Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">
            학습 내용 붙여넣기
          </label>
          <button
            onClick={() => setRawInput(SAMPLE_EN)}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            샘플 채우기
          </button>
        </div>
        <textarea
          value={rawInput}
          onChange={(e) => {
            setRawInput(e.target.value);
            setPreview(null);
          }}
          placeholder={`아래와 같은 형식으로 붙여넣기:

Stress and Pronunciation
(발음/강세 내용)

Vocabulary
word (noun) = definition
--> example sentence

Sentence Structure & Grammar
(문장 구조 내용)

Comment
(코멘트)`}
          rows={16}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm font-mono leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handlePreview}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
        >
          미리보기
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !rawInput.trim()}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* Preview */}
      {preview && (
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          <div className="bg-gray-900 px-4 py-2 border-b border-gray-800">
            <span className="text-sm font-medium text-gray-300">파싱 결과 미리보기</span>
          </div>
          <div className="p-4 space-y-4">
            {preview.stress_pronunciation && (
              <Section title="Stress & Pronunciation" content={preview.stress_pronunciation} color="purple" />
            )}
            {preview.vocabulary && (
              <Section title="Vocabulary" content={preview.vocabulary} color="green" />
            )}
            {preview.sentence_grammar && (
              <Section title="Sentence Structure & Grammar" content={preview.sentence_grammar} color="blue" />
            )}
            {preview.comment && (
              <Section title="Comment" content={preview.comment} color="yellow" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, content, color }: { title: string; content: string; color: string }) {
  const colorMap: Record<string, string> = {
    purple: "border-purple-500/30 text-purple-400",
    green: "border-green-500/30 text-green-400",
    blue: "border-blue-500/30 text-blue-400",
    yellow: "border-yellow-500/30 text-yellow-400",
  };

  return (
    <div className={`border-l-2 pl-4 ${colorMap[color]}`}>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">{content}</pre>
    </div>
  );
}
