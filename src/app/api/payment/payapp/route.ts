import { NextRequest, NextResponse } from "next/server";

const PAYAPP_USERID = "hungtion";
const PAYAPP_API_URL = "https://payapp.kr/oapi/apiLoad.html";

const LEAF_PACKAGES: Record<number, number> = {
  1000: 10,
  1800: 20,
  4000: 50,
};

export async function POST(req: NextRequest) {
  try {
    const { userId, price, goodname } = await req.json();

    if (!userId || !price || !LEAF_PACKAGES[price]) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://language-review.vercel.app";
    const feedbackUrl = `${siteUrl}/api/payment/webhook`;

    const params = new URLSearchParams({
      cmd: "payrequest",
      userid: PAYAPP_USERID,
      goodname: goodname || `Leaf ${LEAF_PACKAGES[price]}`,
      price: String(price),
      recvphone: "01000000000",
      feedbackurl: feedbackUrl,
      var1: userId,
      var2: String(price),
      returnurl: `${siteUrl}/pricing?done=1`,
    });

    const linkKey = process.env.PAYAPP_LINK_KEY;
    if (linkKey) params.set("linkkey", linkKey);

    const res = await fetch(PAYAPP_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const text = await res.text();
    const result = Object.fromEntries(new URLSearchParams(text));

    if (result.state === "1" && result.payurl) {
      return NextResponse.json({ url: result.payurl });
    }

    return NextResponse.json(
      { error: result.errorMessage || "Failed to create payment" },
      { status: 400 }
    );
  } catch (e) {
    console.error("PayApp API error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
