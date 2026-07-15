import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const PROMPT_EN = `Task: Write ONE short, creative motivational sentence.

[Conditions]
* Topic: Pick ONE randomly from (learning new things, building habits, overcoming fear, enjoying the journey, curiosity, patience, self-improvement).
* Length: 8 to 15 words.
* Style: Unique. Strictly AVOID clichés like "embrace the challenge" or "consistent habits". No names of people.
* Output Format: EXACTLY two lines. NOTHING ELSE.
  - Line 1: The English sentence
  - Line 2: The Korean translation

[Negative Constraints]
* DO NOT output labels (e.g., "Line 1:", "Translation:", "Topic:").
* DO NOT use quotation marks.
* DO NOT add any explanations or greetings.`;

const PROMPT_JP = `Task: Write ONE short, creative motivational sentence in Japanese.

[Conditions]
* Topic: Pick ONE randomly from (learning new things, building habits, overcoming fear, enjoying the journey, curiosity, patience, self-improvement).
* Length: 20 to 40 Japanese characters.
* Style: Unique. Strictly AVOID clichés and typical self-help quotes. No names of people.
* Output Format: EXACTLY two lines. NOTHING ELSE.
  - Line 1: The Japanese sentence
  - Line 2: The Korean translation

[Negative Constraints]
* DO NOT output labels (e.g., "Line 1:", "Translation:", "Topic:").
* DO NOT use quotation marks.
* DO NOT add any explanations or greetings.`;

function getServerKstPeriod(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const date = kst.toISOString().split("T")[0];
  const hour = kst.getUTCHours();
  const period = hour >= 8 && hour < 20 ? "AM" : "PM";
  return `${date}-${period}`;
}

async function generateQuote(lang: "english" | "japanese"): Promise<{ quote: string; translation: string }> {
  const currentPeriod = getServerKstPeriod();
  const prompt = (lang === "japanese" ? PROMPT_JP : PROMPT_EN) + `\n\n[System Note: Seed Period - ${currentPeriod}]`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 1.0, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
      }),
      cache: "force-cache",
    }
  );

  const data = await res.json();
  const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "").replace(/^[""\u201C]|[""\u201D]$/g, "");
  const lines = raw.split("\n").map((l: string) => l.trim()).filter((l: string) => l && !/^(topic|theme|テーマ|line\s*\d)\s*[:：]/i.test(l));

  const quote = (lines[0] || "").replace(/^[""\u201C]|[""\u201D]$/g, "");
  const translation = (lines[1] || "").replace(/^[""\u201C]|[""\u201D]$/g, "").replace(/^(번역|翻訳)\s*[:：]\s*/i, "");

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
