import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// In-memory cache: one quote per language per period (AM/PM KST)
const cache: Record<string, { period: string; quote: string; translation: string }> = {};

function getKstPeriod(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const date = kst.toISOString().split("T")[0];
  const hour = kst.getUTCHours();
  // 08:00~19:59 = AM, 20:00~07:59 = PM
  const period = hour >= 8 && hour < 20 ? "AM" : "PM";
  return `${date}-${period}`;
}

async function generateQuote(lang: "english" | "japanese"): Promise<{ quote: string; translation: string }> {
  const period = getKstPeriod();
  const key = `${lang}-${period}`;

  if (cache[key]) return { quote: cache[key].quote, translation: cache[key].translation };

  const prompt = lang === "japanese"
    ? `言語学習に関する名言を1つ書いてください。必ず完全な文にしてください。20文字以上40文字以内。
出力形式(2行のみ):
名言
韓国語翻訳
引用符や説明は不要。`
    : `Write one complete motivational sentence about language learning. Must be a full sentence with subject and verb. 8 to 15 words.
Output format (2 lines only):
The quote
Korean translation
No quotes, no labels, no explanation.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 1.0, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
      }),
    }
  );

  const data = await res.json();
  const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "").replace(/^[""\u201C]|[""\u201D]$/g, "");
  const lines = raw.split("\n").map((l: string) => l.trim()).filter((l: string) => l);

  const quote = (lines[0] || "").replace(/^[""\u201C]|[""\u201D]$/g, "");
  const translation = (lines[1] || "").replace(/^[""\u201C]|[""\u201D]$/g, "");

  if (quote) {
    cache[key] = { period, quote, translation };
    for (const k of Object.keys(cache)) {
      if (cache[k].period !== period) delete cache[k];
    }
  }

  return { quote, translation };
}

export async function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("lang") === "japanese" ? "japanese" : "english";

  try {
    const result = await generateQuote(lang);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ quote: "", translation: "" });
  }
}
