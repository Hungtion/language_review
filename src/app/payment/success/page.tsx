"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    const authKey = searchParams.get("authKey");
    const customerKey = searchParams.get("customerKey");

    if (!authKey || !customerKey) {
      setStatus("error");
      setMessage("결제 정보가 올바르지 않습니다.");
      return;
    }

    async function processBilling() {
      try {
        const res = await fetch("/api/payment/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authKey, customerKey, userId: user!.id }),
        });
        const data = await res.json();

        if (data.success) {
          setStatus("success");
          setMessage("Pro 구독이 시작되었습니다!");
          setTimeout(() => router.push("/"), 2000);
        } else {
          setStatus("error");
          setMessage(data.error || "결제 처리 중 오류가 발생했습니다.");
        }
      } catch {
        setStatus("error");
        setMessage("결제 처리 중 오류가 발생했습니다.");
      }
    }

    processBilling();
  }, [user, searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      {status === "loading" && (
        <>
          <div className="text-4xl mb-4">...</div>
          <p className="text-text-muted">결제 처리 중입니다...</p>
        </>
      )}
      {status === "success" && (
        <>
          <div className="text-4xl mb-4">v</div>
          <h2 className="text-xl font-bold mb-2">{message}</h2>
          <p className="text-text-muted text-sm">잠시 후 홈으로 이동합니다...</p>
        </>
      )}
      {status === "error" && (
        <>
          <div className="text-4xl mb-4">!</div>
          <h2 className="text-xl font-bold mb-2">결제 실패</h2>
          <p className="text-text-muted text-sm mb-4">{message}</p>
          <button
            onClick={() => router.push("/pricing")}
            className="px-6 py-2 bg-bg-input hover:bg-bg-hover rounded-lg text-sm transition-colors"
          >
            다시 시도
          </button>
        </>
      )}
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
