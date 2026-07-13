"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6 text-sm text-text-secondary leading-relaxed">
      <h1 className="text-xl font-bold text-text">이용약관</h1>
      <p className="text-text-muted text-xs">시행일: 2025년 7월 13일</p>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">제1조 (목적)</h2>
        <p>이 약관은 Language LAB(이하 &quot;서비스&quot;)의 이용과 관련하여 서비스 제공자와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">제2조 (서비스의 내용)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>영어 및 일본어 학습 노트 작성 및 관리</li>
          <li>AI 기반 문장 추출 및 복습 카드 생성</li>
          <li>Nuance Chat (AI 번역 및 뉘앙스 설명)</li>
          <li>기타 서비스 제공자가 정하는 기능</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">제3조 (회원가입 및 계정)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>회원가입은 Google 또는 Kakao 소셜 로그인을 통해 이루어집니다.</li>
          <li>이용자는 정확한 정보를 제공해야 하며, 타인의 계정을 사용할 수 없습니다.</li>
          <li>계정 관리 책임은 이용자에게 있습니다.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">제4조 (Leaf 크레딧 및 결제)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Leaf는 AI 기능 사용을 위한 크레딧입니다.</li>
          <li>Leaf 구매 후 사용하지 않은 Leaf에 대해서는 환불이 가능합니다.</li>
          <li>이미 사용한 Leaf에 대해서는 환불이 불가합니다.</li>
          <li>환불 요청은 구매일로부터 7일 이내에 가능하며, 아래 연락처로 요청해 주세요.</li>
          <li>결제는 PayApp(NHN한국사이버결제)을 통해 처리됩니다.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">제5조 (서비스 이용 제한)</h2>
        <p>아래의 경우 서비스 이용이 제한될 수 있습니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>서비스를 비정상적으로 이용하거나 시스템에 부하를 주는 행위</li>
          <li>타인의 정보를 도용하는 행위</li>
          <li>서비스의 운영을 방해하는 행위</li>
          <li>관련 법령에 위반하는 행위</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">제6조 (면책)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>AI가 생성한 번역 및 설명은 참고용이며, 정확성을 보장하지 않습니다.</li>
          <li>천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
          <li>이용자가 작성한 콘텐츠에 대한 책임은 이용자에게 있습니다.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">제7조 (약관의 변경)</h2>
        <p>서비스 제공자는 필요한 경우 약관을 변경할 수 있으며, 변경 시 서비스 내 공지합니다. 변경된 약관에 동의하지 않을 경우 이용자는 회원 탈퇴를 할 수 있습니다.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">제8조 (연락처)</h2>
        <p>서비스 관련 문의: <a href="mailto:kei9oon@gmail.com" className="text-primary underline">kei9oon@gmail.com</a></p>
      </section>

      {/* English */}
      <hr className="border-border my-8" />

      <h1 className="text-xl font-bold text-text">Terms of Service</h1>
      <p className="text-text-muted text-xs">Effective: July 13, 2025</p>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">Article 1 (Purpose)</h2>
        <p>These terms govern the rights, obligations, and responsibilities between the Service provider and users regarding the use of Language LAB (the &quot;Service&quot;).</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">Article 2 (Service Description)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Creating and managing English and Japanese study notes</li>
          <li>AI-powered sentence extraction and review card generation</li>
          <li>Nuance Chat (AI translation and nuance explanation)</li>
          <li>Other features as determined by the Service provider</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">Article 3 (Registration and Accounts)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Registration is completed through Google or Kakao social login.</li>
          <li>Users must provide accurate information and may not use another person&apos;s account.</li>
          <li>Users are responsible for managing their own accounts.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">Article 4 (Leaf Credits and Payments)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Leaf is a credit system for using AI features.</li>
          <li>Unused Leaf credits are eligible for a refund.</li>
          <li>Used Leaf credits are non-refundable.</li>
          <li>Refund requests must be made within 7 days of purchase by contacting us at the address below.</li>
          <li>Payments are processed through PayApp (NHN KCP).</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">Article 5 (Restrictions on Use)</h2>
        <p>Use of the Service may be restricted in the following cases:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Abnormal use or placing excessive load on the system</li>
          <li>Identity theft or impersonation</li>
          <li>Interfering with Service operations</li>
          <li>Violating applicable laws and regulations</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">Article 6 (Disclaimer)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>AI-generated translations and explanations are for reference only; accuracy is not guaranteed.</li>
          <li>The Service is not liable for interruptions caused by force majeure, including natural disasters or system failures.</li>
          <li>Users are responsible for content they create.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">Article 7 (Changes to Terms)</h2>
        <p>The Service provider may modify these terms as necessary and will notify users within the Service. Users who do not agree to the changes may delete their account.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-text">Article 8 (Contact)</h2>
        <p>Service inquiries: <a href="mailto:kei9oon@gmail.com" className="text-primary underline">kei9oon@gmail.com</a></p>
      </section>

      <div className="pt-4 border-t border-border">
        <Link href="/login" className="text-primary text-sm hover:underline">&larr; 돌아가기 / Back</Link>
      </div>
    </div>
  );
}
