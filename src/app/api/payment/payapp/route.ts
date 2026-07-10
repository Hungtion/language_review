import { NextRequest, NextResponse } from "next/server";

const PAYAPP_USERID = "hungtion";
const PAYAPP_API_URL = "https://api.payapp.kr/oapi/apiLoad.php";

const LEAF_PACKAGES: Record<number, number> = {
  500: 5,
  1000: 10,
  2000: 20,
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
      cmd: "paylink",
      userid: PAYAPP_USERID,
      goodname: goodname || `Leaf ${LEAF_PACKAGES[price]}`,
      price: String(price),
      recvphone: "01000000000",
      feedbackurl: feedbackUrl,
      var1: userId,
      var2: String(price),
      returnurl: `${siteUrl}/pricing?done=1`,
      linkkey: process.env.PAYAPP_LINK_KEY || "",
    });

    console.log("PayApp request params:", Object.fromEntries(params));

    const res = await fetch(PAYAPP_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const text = await res.text();
    console.log("PayApp raw response:", text);

    const result = Object.fromEntries(new URLSearchParams(text));
    console.log("PayApp parsed response:", result);

    if (result.state === "1" && result.online_url) {
      return NextResponse.json({ url: result.online_url });
    }

    return NextResponse.json(
      { error: result.errorMessage || result.error_message || `PayApp error: state=${result.state}` },
      { status: 400 }
    );
  } catch (e) {
    console.error("PayApp API error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
