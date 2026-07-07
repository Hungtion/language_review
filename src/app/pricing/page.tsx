"use client";

import { useEffect, useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useLocale } from "@/lib/useLocale";

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;

function PricingContent() {
  const { user, plan } = useAuth();
  const { t, locale } = useLocale();
  const [subStatus, setSubStatus] = useState<string>("none");
  const [subEnd, setSubEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function loadSub() {
      const { data } = await supabase
        .from("users")
        .select("subscription_status, subscription_end")
        .eq("id", user!.id)
        .single();
      if (data) {
        setSubStatus(data.subscription_status || "none");
        setSubEnd(data.subscription_end);
      }
    }
    loadSub();
  }, [user]);

  async function handleSubscribe(method: "CARD" | "TRANSFER") {
    if (!user) return;
    setLoading(true);

    try {
      const customerKey = `user_${user.id.replace(/-/g, "").slice(0, 20)}`;

      // Save customerKey to DB
      await supabase
        .from("users")
        .update({ customer_key: customerKey })
        .eq("id", user.id);

      const tossPayments = await loadTossPayments(CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey });

      await payment.requestBillingAuth({
        method,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: user.email || "",
      });
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm(t("confirmCancelSub"))) return;
    setCancelling(true);

    try {
      const res = await fetch("/api/payment/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSubStatus("cancelled");
        alert(t("cancelledMsg"));
      } else {
        alert(t("cancelFailed") + (data.error || t("unknownError")));
      }
    } catch {
      alert(t("cancelError"));
    }
    setCancelling(false);
  }

  const isActive = plan === "pro" && subStatus === "active";
  const isCancelled = plan === "pro" && subStatus === "cancelled";
  const dateFmt = locale === "ko" ? "ko-KR" : "en-US";

  return (
    <div className="max-w-md mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">{t("proSubTitle")}</h1>
        <p className="text-gray-400 text-sm">{t("proSubDesc")}</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold">
            1,000<span className="text-lg text-gray-400 font-normal">{t("perMonth")}</span>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-green-400">v</span>
            <span className="text-gray-300">{t("nuanceChatDesc")}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-400">v</span>
            <span className="text-gray-300">{t("aiExtractDesc2")}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-400">v</span>
            <span className="text-gray-300">{t("reviewCardAI")}</span>
          </div>
        </div>

        {/* Status */}
        {isActive && (
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 text-center">
            <p className="text-indigo-400 text-sm font-medium">{t("proActive")}</p>
            {subEnd && (
              <p className="text-gray-500 text-xs mt-1">
                {t("nextBilling")}{new Date(subEnd).toLocaleDateString(dateFmt)}
              </p>
            )}
          </div>
        )}

        {isCancelled && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
            <p className="text-yellow-400 text-sm font-medium">{t("cancelScheduled")}</p>
            {subEnd && (
              <p className="text-gray-500 text-xs mt-1">
                {t("expiresOn")}{new Date(subEnd).toLocaleDateString(dateFmt)}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        {(plan === "free" || isCancelled) && (
          <button
            onClick={() => handleSubscribe("CARD")}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? t("processing") : isCancelled ? t("resubscribe") : t("subscribeBtn")}
          </button>
        )}

        {isActive && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-2 text-sm text-gray-500 hover:text-red-400 transition-colors"
          >
            {cancelling ? t("processing") : t("cancelSub")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <RequireAuth>
      <PricingContent />
    </RequireAuth>
  );
}
