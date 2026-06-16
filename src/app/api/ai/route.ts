import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ADMIN_EMAIL = "kei9oon@gmail.com";

async function callGemini(prompt: string, maxTokens = 1024, jsonMode = false) {
  const generationConfig: Record<string, unknown> = {
    temperature: 0.3,
    maxOutputTokens: maxTokens,
  };
  if (jsonMode) {
    generationConfig.responseMimeType = "application/json";
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || "Gemini API error");
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prompt, userEmail, action, rawInput, language, text, targetLangs, tone } = body;

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  // AI 도우미 (카드 복습) - admin only
  if (action === "review") {
    if (userEmail !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    try {
      const text = await callGemini(prompt);
      return NextResponse.json({ result: text });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to call Gemini API";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // AI 파싱 (노트 저장) - all users
  if (action === "parse") {
    const langLabel = language === "english" ? "영어" : "일본어";

    const parsePrompt = `아래 텍스트에서 ${langLabel} 학습용 문장만 추출해줘.
- ${langLabel} 문장만 한 줄에 하나씩 출력해.
- 번호, 타임스탬프, 한국어 번역, 메타데이터는 제외해.
- 다른 설명 없이 문장만 출력해.

텍스트:
${rawInput}`;

    try {
      const text = await callGemini(parsePrompt, 2048);
      return NextResponse.json({ result: text });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to call Gemini API";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // Nuance 번역 - all users
  if (action === "nuance") {
    const langs = (targetLangs as string[]) || ["English"];
    const toneVal = tone || "Polite";
    const languagesString = langs.join(", ");

    const nuancePrompt = `You are a professional language nuance coach named "Nuance AI".
Your goal is to translate Korean text into the following target languages: [${languagesString}] with a ${toneVal} tone.
Focus on naturalness and cultural nuance rather than literal translation.

Input Text: "${text}"
Target Languages: ${languagesString}
Tone: ${toneVal}

Instructions:
For EACH target language, provide a JSON object with the following fields:
1. language: The name of the target language (e.g., "English", "Japanese").
2. translation: Provide the most natural, native-like translation.
   - If the target language is Japanese, use furigana in parentheses after kanji. Example: 私(わたし)は元気(げんき)です。
   - For other languages, just plain text.
3. nuance: Explain in Korean WHY this expression is natural. Compare it with a literal translation if applicable.
4. alternatives: Provide 2-3 alternative expressions in the target language with brief Korean explanations in parentheses.

Output Format: A valid JSON object containing a "results" array.
Return ONLY valid JSON. No Markdown, no code blocks.

Example format:
{
  "results": [
    {
      "language": "English",
      "translation": "Hello, how are you?",
      "nuance": "이 표현은 자연스러운 영어 인사입니다.",
      "alternatives": ["Hi there! (캐주얼한 인사)", "How do you do? (격식 있는 인사)"]
    }
  ]
}`;

    try {
      const result = await callGemini(nuancePrompt, 2048, true);
      const parsed = JSON.parse(result);
      return NextResponse.json({ result: parsed });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to call Gemini API";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
