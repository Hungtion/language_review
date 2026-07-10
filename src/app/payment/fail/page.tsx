"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function FailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");
  const message = searchParams.get("message");

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="text-4xl mb-4">!</div>
      <h2 className="text-xl font-bold mb-2">결제 실패</h2>
      <p className="text-text-muted text-sm mb-1">{message || "결제가 취소되었습니다."}</p>
      {code && <p className="text-text-faint text-xs mb-4">오류 코드: {code}</p>}
      <button
        onClick={() => router.push("/pricing")}
        className="px-6 py-2 bg-bg-input hover:bg-bg-hover rounded-lg text-sm transition-colors"
      >
        돌아가기
      </button>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense>
      <FailContent />
    </Suspense>
  );
}
