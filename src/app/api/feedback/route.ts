import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, email, type, message } = await req.json();

    if (!type || !message?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { error } = await supabase.from("feedback").insert({
      user_id: userId || null,
      email: email || null,
      type,
      message: message.trim(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
