import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const { action, email, password, refresh_token, access_token, query } = await req.json();

    const headers: Record<string, string> = {
      "apikey": SUPABASE_KEY,
      "Content-Type": "application/json",
    };

    // Login
    if (action === "login") {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status, headers: CORS });
    }

    // Refresh token
    if (action === "refresh") {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers,
        body: JSON.stringify({ refresh_token }),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status, headers: CORS });
    }

    // DB query (read-only)
    if (action === "query" && access_token && query) {
      headers["Authorization"] = `Bearer ${access_token}`;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
        method: "GET",
        headers,
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status, headers: CORS });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400, headers: CORS });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500, headers: CORS });
  }
}
