import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const PAYAPP_USERID = "hungtion";

const LEAF_PACKAGES: Record<number, number> = {
  1000: 10,
  2000: 20,
  5000: 50,
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = Object.fromEntries(new URLSearchParams(body));
    console.log("[webhook] params:", JSON.stringify(params));

    const { state, userid, mul_no, price, var1: userId, linkValue } = params;

    // Verify merchant
    if (userid !== PAYAPP_USERID) {
      console.log("[webhook] FAIL: merchant mismatch", userid);
      return new Response("FAIL", { status: 400 });
    }

    // Verify link value
    const expectedValue = process.env.PAYAPP_LINK_VALUE;
    if (expectedValue && linkValue !== expectedValue) {
      console.log("[webhook] FAIL: linkValue mismatch", linkValue, "expected:", expectedValue);
      return new Response("FAIL", { status: 400 });
    }

    // state === "1" means payment success
    if (state !== "1") {
      console.log("[webhook] state not 1:", state);
      return new Response("SUCCESS", { status: 200 });
    }

    if (!userId || !mul_no) {
      console.log("[webhook] FAIL: missing userId or mul_no", { userId, mul_no });
      return new Response("FAIL", { status: 400 });
    }

    const amount = parseInt(price, 10);
    const leaves = LEAF_PACKAGES[amount];
    if (!leaves) {
      return new Response("FAIL", { status: 400 });
    }

    // Idempotency check: prevent duplicate charges
    const { data: existing } = await supabase
      .from("payment_logs")
      .select("id")
      .eq("order_id", mul_no)
      .maybeSingle();

    if (existing) {
      // Already processed
      return new Response("SUCCESS", { status: 200 });
    }

    // Update user credits
    const { data: credit } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (credit) {
      await supabase
        .from("user_credits")
        .update({
          balance: credit.balance + leaves,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("user_credits")
        .insert({ user_id: userId, balance: leaves });
    }

    // Log payment
    await supabase.from("payment_logs").insert({
      order_id: mul_no,
      user_id: userId,
      amount,
      leaves,
      status: "SUCCESS",
    });

    return new Response("SUCCESS", { status: 200 });
  } catch (e) {
    console.error("PayApp webhook error:", e);
    return new Response("FAIL", { status: 500 });
  }
}
