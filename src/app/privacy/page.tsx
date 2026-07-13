"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6 text-sm text-text-secondary leading-relaxed">
      <h1 className="text-xl font-bold text-text">개인정보 처리방침</h1>
      <p className="text-text-muted text-xs">시행일: 2025년 7월 13일</p>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">1. 개인정보의 수집 항목 및 방법</h2>
        <p>Language LAB(이하 &quot;서비스&quot;)은 회원가입 및 서비스 제공을 위해 아래 항목을 수집합니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>필수 항목:</strong> 이메일 주소, 소셜 로그인 식별자(Google/Kakao 계정 ID)</li>
          <li><strong>자동 수집:</strong> 서비스 이용 기록, 접속 로그, 기기 정보</li>
          <li><strong>결제 시:</strong> 결제 수단 정보(PayApp을 통해 처리되며, 카드번호 등 민감정보는 서비스에서 직접 저장하지 않습니다)</li>
        </ul>
        <p>수집 방법: 소셜 로그인(Google, Kakao)을 통한 자동 수집</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">2. 개인정보의 수집 및 이용 목적</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>회원 식별 및 가입 관리</li>
          <li>학습 노트, 복습 카드 등 서비스 기능 제공</li>
          <li>AI 기능(Nuance Chat, AI 추출) 제공</li>
          <li>Leaf(크레딧) 결제 및 충전 처리</li>
          <li>서비스 개선 및 통계 분석</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">3. 개인정보의 보유 및 이용 기간</h2>
        <p>회원 탈퇴 시까지 보유하며, 탈퇴 요청 시 지체 없이 파기합니다. 단, 관련 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>전자상거래 관련 기록: 5년 (전자상거래법)</li>
          <li>접속 로그: 3개월 (통신비밀보호법)</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">4. 개인정보의 제3자 제공</h2>
        <p>서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 아래의 경우 예외로 합니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>이용자가 사전에 동의한 경우</li>
          <li>법령에 의해 요구되는 경우</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">5. 개인정보 처리 위탁</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Supabase:</strong> 데이터 저장 및 인증</li>
          <li><strong>Vercel:</strong> 서비스 호스팅</li>
          <li><strong>Google (Gemini API):</strong> AI 기능 제공</li>
          <li><strong>PayApp (NHN한국사이버결제):</strong> 결제 처리</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">6. 이용자의 권리</h2>
        <p>이용자는 언제든지 자신의 개인정보에 대해 열람, 수정, 삭제, 처리 정지를 요청할 수 있습니다. 계정 삭제를 원하시면 설정 페이지에서 직접 탈퇴하거나 아래 연락처로 요청해 주세요.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">7. 개인정보의 파기</h2>
        <p>보유 기간이 경과하거나 처리 목적이 달성된 경우, 해당 개인정보를 지체 없이 파기합니다. 전자적 파일은 복구 불가능한 방법으로 삭제합니다.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">8. 연락처</h2>
        <p>개인정보 관련 문의: <a href="mailto:kei9oon@gmail.com" className="text-primary underline">kei9oon@gmail.com</a></p>
      </section>

      {/* English */}
      <hr className="border-border my-8" />

      <h1 className="text-xl font-bold text-text">Privacy Policy</h1>
      <p className="text-text-muted text-xs">Effective: July 13, 2025</p>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">1. Information We Collect</h2>
        <p>Language LAB (the &quot;Service&quot;) collects the following information for registration and service operation.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Required:</strong> Email address, social login identifier (Google/Kakao account ID)</li>
          <li><strong>Automatically collected:</strong> Service usage logs, access logs, device information</li>
          <li><strong>For payments:</strong> Payment method information (processed through PayApp; sensitive data such as card numbers are not stored by the Service)</li>
        </ul>
        <p>Collection method: Automatic collection via social login (Google, Kakao)</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">2. Purpose of Collection</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>User identification and account management</li>
          <li>Providing study notes, review cards, and other service features</li>
          <li>Providing AI features (Nuance Chat, AI extraction)</li>
          <li>Processing Leaf (credit) payments and top-ups</li>
          <li>Service improvement and statistical analysis</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">3. Retention Period</h2>
        <p>Personal information is retained until account deletion. Upon request, data will be destroyed without delay. However, certain records may be retained as required by applicable laws.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>E-commerce transaction records: 5 years (Electronic Commerce Act)</li>
          <li>Access logs: 3 months (Protection of Communications Secrets Act)</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">4. Disclosure to Third Parties</h2>
        <p>The Service does not provide personal information to third parties, except in the following cases:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>When the user has given prior consent</li>
          <li>When required by law</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">5. Third-Party Service Providers</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Supabase:</strong> Data storage and authentication</li>
          <li><strong>Vercel:</strong> Service hosting</li>
          <li><strong>Google (Gemini API):</strong> AI features</li>
          <li><strong>PayApp (NHN KCP):</strong> Payment processing</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">6. Your Rights</h2>
        <p>You may request access, correction, deletion, or suspension of processing of your personal information at any time. To delete your account, use the settings page or contact us at the address below.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">7. Data Destruction</h2>
        <p>When the retention period expires or the purpose of processing is fulfilled, personal information will be destroyed without delay. Electronic files are deleted using methods that prevent recovery.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">8. Contact</h2>
        <p>Privacy inquiries: <a href="mailto:kei9oon@gmail.com" className="text-primary underline">kei9oon@gmail.com</a></p>
      </section>

      <div className="pt-4 border-t border-border">
        <Link href="/login" className="text-primary text-sm hover:underline">&larr; 돌아가기 / Back</Link>
      </div>
    </div>
  );
}
