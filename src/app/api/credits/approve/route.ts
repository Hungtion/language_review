import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "kei9oon@gmail.com";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { requestId, adminEmail } = await req.json();

    if (adminEmail !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get request
    const { data: request, error: reqErr } = await supabase
      .from("credit_requests")
      .select("*")
      .eq("id", requestId)
      .eq("status", "pending")
      .maybeSingle();

    if (reqErr || !request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Update credits
    const { data: existing } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", request.user_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("user_credits")
        .update({ balance: existing.balance + request.credits, updated_at: new Date().toISOString() })
        .eq("user_id", request.user_id);
    } else {
      await supabase
        .from("user_credits")
        .insert({ user_id: request.user_id, balance: request.credits });
    }

    // Mark approved
    await supabase
      .from("credit_requests")
      .update({ status: "approved" })
      .eq("id", requestId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
