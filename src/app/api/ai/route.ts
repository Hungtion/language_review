import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ADMIN_EMAIL = "kei9oon@gmail.com";

async function callGemini(prompt: string, maxTokens = 1024) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: maxTokens,
        },
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
  const { prompt, userEmail, action, rawInput, language } = body;

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

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
