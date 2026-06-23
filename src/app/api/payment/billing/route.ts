import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client to bypass RLS
function getAdminSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

const TOSS_AUTH = Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");

export async function POST(req: NextRequest) {
  const { authKey, customerKey, userId } = await req.json();

  if (!authKey || !customerKey || !userId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    // 1. Issue billing key
    const billingRes = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
      method: "POST",
      headers: {
        Authorization: `Basic ${TOSS_AUTH}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ authKey, customerKey }),
    });

    const billingData = await billingRes.json();

    if (!billingRes.ok) {
      return NextResponse.json({ error: billingData.message || "빌링키 발급 실패" }, { status: 400 });
    }

    const billingKey = billingData.billingKey;

    // 2. First payment
    const orderId = `order_${userId.replace(/-/g, "").slice(0, 12)}_${Date.now()}`;
    const payRes = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${TOSS_AUTH}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerKey,
        amount: 1000,
        orderId,
        orderName: "Sean's Language Lab Pro 월 구독",
        customerEmail: billingData.card?.ownerType === "개인" ? undefined : undefined,
      }),
    });

    const payData = await payRes.json();

    if (!payRes.ok) {
      return NextResponse.json({ error: payData.message || "결제 실패" }, { status: 400 });
    }

    // 3. Update user plan in DB
    const subscriptionEnd = new Date();
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

    const adminSupabase = getAdminSupabase();
    await adminSupabase
      .from("users")
      .update({
        plan: "pro",
        billing_key: billingKey,
        customer_key: customerKey,
        subscription_status: "active",
        subscription_end: subscriptionEnd.toISOString(),
      })
      .eq("id", userId);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Payment processing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
