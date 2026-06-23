import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

export async function POST(req: NextRequest) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    const adminSupabase = getAdminSupabase();

    // Mark subscription as cancelled (keep pro until subscription_end)
    await adminSupabase
      .from("users")
      .update({
        subscription_status: "cancelled",
        billing_key: null,
      })
      .eq("id", userId);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Cancel failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
