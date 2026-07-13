import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EC_BASE = "https://s.englishchannel.co.kr";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** Login to English Channel, return session cookie */
async function ecLogin(loginId: string, password: string): Promise<string | null> {
  const res = await fetch(`${EC_BASE}/m_login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ login_id: loginId, password }),
    redirect: "manual",
  });

  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;

  const match = setCookie.match(/ci_session=([^;]+)/);
  return match ? match[1] : null;
}

/** Fetch feedback list page, return array of { feedbackId, date, teacher } */
async function ecFetchList(cookie: string, ecUserId: string) {
  const res = await fetch(`${EC_BASE}/m_lesson_feedback/index/${ecUserId}`, {
    headers: { Cookie: `ci_session=${cookie}` },
  });
  const html = await res.text();

  // Check if redirected to login page
  if (html.includes("login_id") && html.includes("password") && !html.includes("출석 레슨")) {
    return null; // not authenticated
  }

  const feedbacks: { feedbackId: string; date: string; teacher: string }[] = [];
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[0];
    const linkMatch = row.match(/\/m_lesson_feedback\/detail\/\d+\/(\d+)/);
    const dateMatch = row.match(/<strong>(\d{4}-\d{2}-\d{2})<\/strong>/);
    const teacherMatch = row.match(/<td[^>]*>([^<]+)<\/t[hd]>/);


    if (linkMatch && dateMatch) {
      feedbacks.push({
        feedbackId: linkMatch[1],
        date: dateMatch[1],
        teacher: teacherMatch ? teacherMatch[1].trim() : "",
      });
    }
  }

  return feedbacks;
}

/** Fetch a single feedback detail, parse sections */
async function ecFetchDetail(cookie: string, ecUserId: string, feedbackId: string) {
  const res = await fetch(`${EC_BASE}/m_lesson_feedback/detail/${ecUserId}/${feedbackId}`, {
    headers: { Cookie: `ci_session=${cookie}` },
  });
  const html = await res.text();

  function extractSection(sectionName: string): string {
    // Find the section header, then extract content from the next div
    const escaped = sectionName.replace(/&/g, "&amp;");
    const regex = new RegExp(
      escaped + `[\\s\\S]*?<\\/div>\\s*<div class="p-3[^"]*"[^>]*>([\\s\\S]*?)<\\/div>\\s*<\\/div>`,
    );
    const match = html.match(regex);
    if (!match) return "";

    // Strip HTML tags, decode entities, clean up
    return match[1]
      .replace(/<p>/g, "")
      .replace(/<\/p>/g, "\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&quot;/g, '"')
      .replace(/<[^>]+>/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join("\n");
  }

  // Extract lesson title from Information table
  const lessonMatch = html.match(/<strong>Lesson<\/strong>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/);
  const lesson = lessonMatch ? lessonMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  return {
    lesson,
    stress_pronunciation: extractSection("Stress and Pronunciation"),
    vocabulary: extractSection("Vocabulary"),
    sentence_grammar: extractSection("Sentence Structure"),
    comment: extractSection("Comment"),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { ecLoginId, ecPassword, userId, existingDates } = await req.json();

    if (!ecLoginId || !ecPassword || !userId) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    // Step 1: Login
    const cookie = await ecLogin(ecLoginId, ecPassword);
    if (!cookie) {
      return NextResponse.json({ error: "잉글리쉬채널 로그인 실패. 아이디/비밀번호를 확인해주세요." }, { status: 401 });
    }

    // Step 2: Get feedback list
    // Extract English Channel user ID from the first feedback link
    // Fetch m_home and look for the link
    const homeRes = await fetch(`${EC_BASE}/m_home`, {
      headers: { Cookie: `ci_session=${cookie}` },
    });
    const homeHtml = await homeRes.text();
    const ecUserIdMatch = homeHtml.match(/\/m_lesson_feedback\/index\/(\d+)/);
    if (!ecUserIdMatch) {
      return NextResponse.json({ error: "잉글리쉬채널 유저 정보를 찾을 수 없습니다." }, { status: 400 });
    }
    const ecUserId = ecUserIdMatch[1];

    const feedbacks = await ecFetchList(cookie, ecUserId);
    if (feedbacks === null) {
      return NextResponse.json({ error: "잉글리쉬채널 세션이 만료되었습니다." }, { status: 401 });
    }

    // Step 3: Filter out already-imported dates
    const skipDates = new Set(existingDates || []);
    const newFeedbacks = feedbacks.filter((f) => !skipDates.has(f.date));

    if (newFeedbacks.length === 0) {
      return NextResponse.json({ imported: 0, message: "새로운 피드백이 없습니다." });
    }

    // Step 4: Fetch details and create notes
    const imported: { date: string; teacher: string }[] = [];

    for (const fb of newFeedbacks) {
      const detail = await ecFetchDetail(cookie, ecUserId, fb.feedbackId);

      // Skip if all sections are empty
      if (!detail.stress_pronunciation && !detail.vocabulary && !detail.sentence_grammar && !detail.comment) {
        continue;
      }

      const { error } = await supabaseAdmin.from("study_sessions").insert({
        language: "english",
        study_date: fb.date,
        title: detail.lesson
          ? `${detail.lesson}${fb.teacher ? ` - ${fb.teacher}` : ""}`
          : `${fb.teacher || "Lesson"} - ${fb.date}`,
        stress_pronunciation: detail.stress_pronunciation || null,
        vocabulary: detail.vocabulary || null,
        sentence_grammar: detail.sentence_grammar || null,
        comment: detail.comment || null,
        raw_input: [
          detail.stress_pronunciation ? `Stress and Pronunciation\n${detail.stress_pronunciation}` : "",
          detail.vocabulary ? `Vocabulary\n${detail.vocabulary}` : "",
          detail.sentence_grammar ? `Sentence Structure & Grammar\n${detail.sentence_grammar}` : "",
          detail.comment ? `Comment\n${detail.comment}` : "",
        ].filter(Boolean).join("\n\n"),
        user_id: userId,
      });

      if (!error) {
        imported.push({ date: fb.date, teacher: fb.teacher });
      }

      // Delay between requests to be nice to English Channel server
      await new Promise((r) => setTimeout(r, 500));
    }

    return NextResponse.json({
      imported: imported.length,
      total: feedbacks.length,
      details: imported,
    });
  } catch (err) {
    console.error("[ec/import] error:", err);
    return NextResponse.json({ error: "가져오기 중 오류가 발생했습니다." }, { status: 500 });
  }
}
