import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
      return NextResponse.json(data, { status: res.status });
    }

    // Refresh token
    if (action === "refresh") {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers,
        body: JSON.stringify({ refresh_token }),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    // DB query (read-only)
    if (action === "query" && access_token && query) {
      headers["Authorization"] = `Bearer ${access_token}`;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
        method: "GET",
        headers,
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
