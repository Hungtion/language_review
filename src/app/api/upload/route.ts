import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  // Text file
  if (name.endsWith(".txt")) {
    const text = buffer.toString("utf-8");
    return NextResponse.json({ text });
  }

  // Word document
  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return NextResponse.json({ text: result.value });
    } catch {
      return NextResponse.json({ error: "Failed to parse Word file" }, { status: 500 });
    }
  }

  // PDF — pdf-parse v1 (direct import to bypass test file loading)
  if (name.endsWith(".pdf")) {
    const t0 = Date.now();
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse");
      const result = await pdfParse(buffer);
      const text = result.text?.trim() || "";
      return NextResponse.json({
        text,
        debug: { pages: result.numpages, extractedLen: text.length, fileSize: `${(buffer.length / 1024).toFixed(0)}KB`, time: `${Date.now() - t0}ms` },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "PDF parse failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // Image → Gemini Vision OCR
  if (/\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(name)) {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/png";

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "이 이미지에서 텍스트를 모두 추출해줘. 다른 설명 없이 텍스트만 출력해." },
                { inlineData: { mimeType, data: base64 } },
              ],
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gemini API error");
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return NextResponse.json({ text, usedAi: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "OCR failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
}
