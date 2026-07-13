"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/useLocale";
import { supabase } from "@/lib/supabase";
import GuideOverlay from "@/components/GuideOverlay";

function SettingsContent() {
  const { user, plan, credits, signOut } = useAuth();
  const router = useRouter();
  const { locale, setLocale, t } = useLocale();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"bug" | "feedback" | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [showEcImport, setShowEcImport] = useState(false);
  const [ecLoginId, setEcLoginId] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ec-login-id") || "" : ""
  );
  const [ecPassword, setEcPassword] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ec-password") || "" : ""
  );
  const [ecImporting, setEcImporting] = useState(false);
  const [ecResult, setEcResult] = useState<{ imported: number; total: number; details?: { date: string; teacher: string }[] } | null>(null);
  const [ecSaveCredentials, setEcSaveCredentials] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ec-save-credentials") === "true" : false
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedEN, setSelectedEN] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("tts-voice-en") || "" : ""
  );
  const [selectedJP, setSelectedJP] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("tts-voice-jp") || "" : ""
  );
  const [autoplay, setAutoplay] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("tts-autoplay") === "true" : false
  );
  const [displayName, setDisplayName] = useState("");
  const [nameEditing, setNameEditing] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameInitialized, setNameInitialized] = useState(false);
  const [engChannel, setEngChannel] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("eng-channel") === "true" : false
  );
  const [splitAuto, setSplitAuto] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("split-auto") : null
  );
  const [theme, setThemeState] = useState<"system" | "dark" | "light">(() =>
    typeof window !== "undefined" ? (localStorage.getItem("theme") as "system" | "dark" | "light") || "system" : "system"
  );
  const [variant, setVariantState] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("theme-variant") || "default" : "default"
  );
  const [accent, setAccentState] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("theme-accent") || "" : ""
  );

  useEffect(() => {
    if (!nameInitialized && user) {
      setDisplayName(user.user_metadata?.full_name || user.user_metadata?.name || "");
      setNameInitialized(true);
    }
  }, [user, nameInitialized]);

  async function saveDisplayName() {
    if (!user) return;
    const trimmed = displayName.trim();
    if (trimmed.length > 20) return;
    setNameSaving(true);
    await supabase.auth.updateUser({ data: { full_name: trimmed } });
    await supabase.auth.refreshSession();
    setNameSaving(false);
    setNameEditing(false);
  }

  useEffect(() => {
    function loadVoices() {
      setVoices(speechSynthesis.getVoices());
    }
    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  function preview(name: string, lang: "en" | "ja") {
    speechSynthesis.cancel();
    const text = lang === "en" ? "Hello, this is my voice." : "\u3053\u3093\u306b\u3061\u306f\u3001\u3053\u308c\u306f\u79c1\u306e\u58f0\u3067\u3059\u3002";
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === "en" ? "en-US" : "ja-JP";
    const voice = voices.find((v) => v.name === name);
    if (voice) utter.voice = voice;
    utter.rate = 0.9;
    speechSynthesis.speak(utter);
  }

  const enVoices = voices.filter(
    (v) => v.lang === "en-US" && !v.name.toLowerCase().includes("compact") && !v.name.toLowerCase().includes("enhanced")
  );
  const jpVoices = voices.filter(
    (v) => v.lang.startsWith("ja") && !v.name.toLowerCase().includes("compact") && !v.name.toLowerCase().includes("enhanced")
  );

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <GuideOverlay pageKey="settings" />

      <div className="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        {/* My Name */}
        <div className="flex items-center justify-between">
          {nameEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={displayName}
                onChange={(e) => {
                  const v = e.target.value.replace(/[<>"'&;]/g, "");
                  if (v.length <= 20) setDisplayName(v);
                }}
                placeholder={locale === "ko" ? "내 이름" : "My Name"}
                maxLength={20}
                autoFocus
                className="flex-1 min-w-0 bg-bg-input border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={saveDisplayName}
                disabled={nameSaving || !displayName.trim()}
                className="shrink-0 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {nameSaving ? "..." : (locale === "ko" ? "저장" : "Save")}
              </button>
              <button
                onClick={() => {
                  setDisplayName(user?.user_metadata?.full_name || user?.user_metadata?.name || "");
                  setNameEditing(false);
                }}
                className="shrink-0 px-3 py-1.5 text-xs font-medium text-text-muted bg-bg-input border border-border rounded-lg hover:bg-bg-hover transition-colors"
              >
                {locale === "ko" ? "취소" : "Cancel"}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text">{displayName || (locale === "ko" ? "미설정" : "Not set")}</span>
              </div>
              <button
                onClick={() => setNameEditing(true)}
                className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors"
              >
                {locale === "ko" ? "변경" : "Edit"}
              </button>
            </>
          )}
        </div>
        {/* Leaf */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">🍃 Leaf</span>
            <span className="text-sm font-semibold text-primary">{credits}</span>
          </div>
          <button
            onClick={() => router.push("/pricing")}
            className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors"
          >
            {locale === "ko" ? "충전하기" : "Top Up"}
          </button>
        </div>
      </div>

      <div data-guide="settings-lang" className="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-text-secondary">{t("language")}</h2>
        <div className="flex gap-2">
          {(["en", "ko"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                locale === l
                  ? "bg-primary text-primary-text"
                  : "bg-bg-input text-text-muted hover:text-text"
              }`}
            >
              {l === "en" ? "English" : "한국어"}
            </button>
          ))}
        </div>
      </div>

      <div data-guide="settings-theme" className="bg-bg-card border border-border rounded-xl p-5 space-y-5">
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-secondary">{locale === "ko" ? "화면 모드" : "Display Mode"}</h2>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setThemeState(t);
                  if (t === "system") {
                    localStorage.removeItem("theme");
                    document.documentElement.removeAttribute("data-theme");
                  } else {
                    localStorage.setItem("theme", t);
                    document.documentElement.setAttribute("data-theme", t);
                  }
                }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                  theme === t
                    ? "bg-primary text-primary-text"
                    : "bg-bg-input text-text-muted hover:text-text"
                }`}
              >
                {t === "light" ? (locale === "ko" ? "밝은 화면" : "Light")
                  : t === "dark" ? (locale === "ko" ? "어두운 화면" : "Dark")
                  : (locale === "ko" ? "시스템" : "System")}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <h2 className="text-sm font-medium text-text-secondary">{locale === "ko" ? "세부 테마" : "Theme Style"}</h2>
          <div className="flex flex-col gap-2">
            {([
              { key: "default", ko: "기본", en: "Default", desc_ko: "깔끔하고 선명한 톤", desc_en: "Clean & crisp" },
              { key: "comfort", ko: "눈 편한 모드", en: "Comfort", desc_ko: "눈의 피로를 줄여주는 따뜻한 톤", desc_en: "Warm sepia tones" },
              { key: "midnight", ko: "차분한 화면", en: "Calm", desc_ko: "부드러운 네이비 블루 톤", desc_en: "Soft navy blue tones" },
            ] as const).map((v) => (
              <button
                key={v.key}
                onClick={() => {
                  setVariantState(v.key);
                  if (v.key === "default") {
                    localStorage.removeItem("theme-variant");
                    document.documentElement.removeAttribute("data-variant");
                  } else {
                    localStorage.setItem("theme-variant", v.key);
                    document.documentElement.setAttribute("data-variant", v.key);
                  }
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  variant === v.key
                    ? "bg-primary/15 border border-primary/40 text-text"
                    : "bg-bg-input text-text-muted hover:text-text"
                }`}
              >
                <span className="text-sm font-medium">{locale === "ko" ? v.ko : v.en}</span>
                <span className="block text-xs mt-0.5 opacity-70">{locale === "ko" ? v.desc_ko : v.desc_en}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <h2 className="text-sm font-medium text-text-secondary">{locale === "ko" ? "나만의 컬러" : "Accent Color"}</h2>
          <div className="flex gap-3 justify-center">
            {([
              { key: "", color: "#818cf8", label: "Indigo" },
              { key: "mint", color: "#2dd4bf", label: "Mint" },
              { key: "coral", color: "#f0a0a0", label: "Coral" },
              { key: "lavender", color: "#b8a5f5", label: "Lavender" },
              { key: "gold", color: "#e5b835", label: "Gold" },
              { key: "rose", color: "#f28b9a", label: "Rose" },
            ]).map((a) => (
              <button
                key={a.key}
                onClick={() => {
                  setAccentState(a.key);
                  if (a.key === "") {
                    localStorage.removeItem("theme-accent");
                    document.documentElement.removeAttribute("data-accent");
                  } else {
                    localStorage.setItem("theme-accent", a.key);
                    document.documentElement.setAttribute("data-accent", a.key);
                  }
                  setTimeout(() => (window as unknown as { __fixPT?: () => void }).__fixPT?.(), 0);
                }}
                className="flex flex-col items-center gap-1.5"
                title={a.label}
              >
                <span
                  className={`w-8 h-8 rounded-full transition-all ${
                    accent === a.key ? "ring-2 ring-offset-2 ring-offset-bg scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: a.color, ...(accent === a.key ? { boxShadow: `0 0 12px ${a.color}80` } : {}) }}
                />
                <span className="text-[10px] text-text-faint">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div data-guide="settings-tts" className="bg-bg-card border border-border rounded-xl p-5 space-y-5">
        <h2 className="text-sm font-medium text-text-secondary">{t("ttsVoice")}</h2>

        <div className="space-y-2">
          <label className="text-xs text-text-muted">{t("englishUS")}</label>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-1.5 flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                setSelectedEN("");
                localStorage.setItem("tts-voice-en", "");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                selectedEN === ""
                  ? "bg-primary text-primary-text"
                  : "bg-bg-input text-text-muted hover:text-text"
              }`}
            >
              {t("default")}
            </button>
            {enVoices.map((v) => {
              const label = v.name.replace(/^Microsoft\s+/i, "").replace(/\s+Online\s*\(Natural\)/i, "");
              return (
                <button
                  key={v.name}
                  onClick={() => {
                    setSelectedEN(v.name);
                    localStorage.setItem("tts-voice-en", v.name);
                    preview(v.name, "en");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedEN === v.name
                      ? "bg-primary text-primary-text"
                      : "bg-bg-input text-text-muted hover:text-text"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-text-muted">{t("japanese")}</label>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-1.5 flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                setSelectedJP("");
                localStorage.setItem("tts-voice-jp", "");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                selectedJP === ""
                  ? "bg-primary text-primary-text"
                  : "bg-bg-input text-text-muted hover:text-text"
              }`}
            >
              {t("default")}
            </button>
            {jpVoices.map((v) => {
              const label = v.name.replace(/^Microsoft\s+/i, "").replace(/\s+Online\s*\(Natural\)/i, "");
              return (
                <button
                  key={v.name}
                  onClick={() => {
                    setSelectedJP(v.name);
                    localStorage.setItem("tts-voice-jp", v.name);
                    preview(v.name, "ja");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedJP === v.name
                      ? "bg-primary text-primary-text"
                      : "bg-bg-input text-text-muted hover:text-text"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-text-faint">{t("iosVoiceGuide")}</p>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-text-secondary">{t("autoPlay")}</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">{t("autoPlayDesc")}</span>
          <button
            onClick={() => {
              const next = !autoplay;
              localStorage.setItem("tts-autoplay", String(next));
              setAutoplay(next);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              autoplay ? "bg-primary" : "bg-bg-hover"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                autoplay ? "translate-x-[24px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-text-secondary">{t("engChannel")}</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">{t("engChannelDesc")}</span>
          <button
            onClick={() => {
              const next = !engChannel;
              localStorage.setItem("eng-channel", String(next));
              setEngChannel(next);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              engChannel ? "bg-primary" : "bg-bg-hover"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                engChannel ? "translate-x-[24px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        {engChannel && (
          <div className="pt-3 border-t border-border">
            <button
              onClick={() => { setShowEcImport(true); setEcResult(null); }}
              className="w-full py-2.5 rounded-lg text-sm bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors font-medium"
            >
              {locale === "ko" ? "English Channel 피드백 가져오기" : "Import English Channel Feedback"}
            </button>
            <p className="text-xs text-text-faint mt-2">
              {locale === "ko" ? "English Channel 수업 피드백을 자동으로 노트에 추가합니다." : "Auto-import lesson feedback as notes."}
            </p>
          </div>
        )}
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-text-secondary">{locale === "ko" ? "카드 나눌 때 기존 카드 삭제" : "Delete original when splitting"}</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">
            {splitAuto === "keep"
              ? (locale === "ko" ? "기존 카드를 유지합니다" : "Keep original card")
              : (locale === "ko" ? "나뉘어진 카드로 대체합니다" : "Replace with split cards")}
          </span>
          <button
            onClick={() => {
              if (splitAuto === "keep") {
                // 켜기: split-auto 제거 → 다음에 다시 물어봄
                localStorage.removeItem("split-auto");
                setSplitAuto(null);
              } else {
                // 끄기: keep 저장 → 안 물어봄, 기존 카드 유지
                localStorage.setItem("split-auto", "keep");
                setSplitAuto("keep");
              }
            }}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              splitAuto !== "keep" ? "bg-primary" : "bg-bg-hover"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                splitAuto !== "keep" ? "translate-x-[24px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-text-secondary">{t("account")}</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted flex items-center gap-1.5">
            {(() => {
              const provider = user?.app_metadata?.provider;
              if (provider === "kakao") return <span title="Kakao">💬</span>;
              if (provider === "google") return <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>;
              return <span>📧</span>;
            })()}
            {user?.email}
          </p>
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            {t("logout")}
          </button>
        </div>
        <div className="pt-2 border-t border-border">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-text-faint hover:text-red-400 transition-colors"
          >
            {locale === "ko" ? "회원 탈퇴" : "Delete Account"}
          </button>
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <a
          href="https://qr.kakaopay.com/Ej7lvEtQc"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 bg-[#FEE500]/20 hover:bg-[#FEE500]/30 text-text-secondary rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 3C6.48 3 2 6.44 2 10.65c0 2.68 1.78 5.05 4.48 6.42-.15.54-.97 3.5-.99 3.7 0 0-.02.17.09.23.11.07.24.01.24.01.32-.04 3.7-2.44 4.28-2.86.6.09 1.23.13 1.9.13 5.52 0 10-3.44 10-7.65S17.52 3 12 3z"/>
          </svg>
          {locale === "ko" ? "카카오페이로 후원하기" : "Support via KakaoPay"}
        </a>
        <div className="border-t border-border pt-4 space-y-3">
          <button
            onClick={() => { setFeedbackType("bug"); setFeedbackMsg(""); }}
            className="w-full py-2.5 rounded-lg text-sm bg-bg-input text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
          >
            {locale === "ko" ? "피드백 보내기" : "Send Feedback"}
          </button>
          <div className="flex gap-2">
            <a href="/terms" className="flex-1 py-2.5 rounded-lg text-sm bg-bg-input text-text-muted hover:text-text hover:bg-bg-hover transition-colors text-center">
              {locale === "ko" ? "이용약관" : "Terms"}
            </a>
            <a href="/privacy" className="flex-1 py-2.5 rounded-lg text-sm bg-bg-input text-text-muted hover:text-text hover:bg-bg-hover transition-colors text-center">
              {locale === "ko" ? "개인정보 처리방침" : "Privacy"}
            </a>
          </div>
          <div className="text-center space-y-2">
            <img src="/icon-192.png" alt="Language LAB" className="w-12 h-12 mx-auto rounded-xl" />
            <p className="text-sm font-medium text-text-secondary">Language LAB</p>
            <p className="text-xs text-text-faint">v{process.env.NEXT_PUBLIC_APP_VERSION}</p>
            <p className="text-xs text-text-faint">© 2026 Hungtion</p>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border-light rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <h3 className="text-lg font-bold text-text">
              {locale === "ko" ? "정말 탈퇴하시겠습니까?" : "Delete your account?"}
            </h3>
            <p className="text-sm text-text-muted whitespace-pre-line">
              {locale === "ko"
                ? "모든 노트, 복습 카드, 채팅 기록이 삭제되며\n복구할 수 없습니다."
                : "All notes, flashcards, and chat history will be permanently deleted.\nThis cannot be undone."}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-2.5 bg-bg-input hover:bg-bg-hover text-text-secondary rounded-xl text-sm transition-colors"
              >
                {locale === "ko" ? "취소" : "Cancel"}
              </button>
              <button
                onClick={async () => {
                  if (!user) return;
                  setDeleting(true);
                  try {
                    const res = await fetch("/api/account/delete", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: user.id }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      await signOut();
                      router.push("/login");
                    } else {
                      alert(data.error || "Failed to delete account");
                    }
                  } catch {
                    alert("Failed to delete account");
                  }
                  setDeleting(false);
                  setShowDeleteConfirm(false);
                }}
                disabled={deleting}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {deleting
                  ? (locale === "ko" ? "처리 중..." : "Deleting...")
                  : (locale === "ko" ? "탈퇴하기" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackType && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border-light rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-text text-center">
              {locale === "ko" ? "피드백 보내기" : "Send Feedback"}
            </h3>
            <div className="flex gap-2">
              {(["bug", "feedback"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFeedbackType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                    feedbackType === t
                      ? "bg-primary text-primary-text"
                      : "bg-bg-input text-text-muted hover:text-text"
                  }`}
                >
                  {t === "bug"
                    ? (locale === "ko" ? "오류 신고" : "Bug Report")
                    : (locale === "ko" ? "개선 요청" : "Suggestion")}
                </button>
              ))}
            </div>
            <textarea
              value={feedbackMsg}
              onChange={(e) => setFeedbackMsg(e.target.value)}
              placeholder={feedbackType === "bug"
                ? (locale === "ko" ? "어떤 오류가 발생했나요?" : "What went wrong?")
                : (locale === "ko" ? "의견을 자유롭게 적어주세요." : "Share your thoughts.")}
              className="w-full h-32 bg-bg-input border border-border rounded-xl p-3 text-sm text-text placeholder:text-text-faint resize-none focus:outline-none focus:border-primary"
            />
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setFeedbackType(null)}
                className="px-6 py-2.5 bg-bg-input hover:bg-bg-hover text-text-secondary rounded-xl text-sm transition-colors"
              >
                {locale === "ko" ? "취소" : "Cancel"}
              </button>
              <button
                onClick={async () => {
                  if (!feedbackMsg.trim()) return;
                  setFeedbackSending(true);
                  try {
                    const res = await fetch("/api/feedback", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: user?.id,
                        email: user?.email,
                        type: feedbackType,
                        message: feedbackMsg,
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      alert(locale === "ko" ? "전송되었습니다. 감사합니다!" : "Sent! Thank you!");
                    } else {
                      alert(data.error || "Failed");
                    }
                  } catch {
                    alert("Failed to send");
                  }
                  setFeedbackSending(false);
                  setFeedbackType(null);
                }}
                disabled={feedbackSending || !feedbackMsg.trim()}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-text rounded-xl text-sm font-medium transition-colors"
              >
                {feedbackSending
                  ? (locale === "ko" ? "전송 중..." : "Sending...")
                  : (locale === "ko" ? "보내기" : "Send")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEcImport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => { if (!ecImporting) { setShowEcImport(false); setEcResult(null); } }}>
          <div className="bg-bg-card border border-border-light rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text text-center">
              {locale === "ko" ? "English Channel 연동" : "English Channel Import"}
            </h3>

            {ecResult ? (
              <div className="space-y-3 text-center">
                <div className="text-4xl">{ecResult.imported > 0 ? "🎉" : "📭"}</div>
                <p className="text-sm text-text-secondary">
                  {ecResult.imported > 0
                    ? (locale === "ko"
                      ? `${ecResult.imported}개의 피드백을 가져왔습니다!`
                      : `Imported ${ecResult.imported} feedbacks!`)
                    : (locale === "ko"
                      ? "새로운 피드백이 없습니다."
                      : "No new feedbacks to import.")}
                </p>
                {ecResult.details && ecResult.details.length > 0 && (
                  <div className="max-h-40 overflow-y-auto text-left">
                    {ecResult.details.map((d, i) => (
                      <div key={i} className="text-xs text-text-muted py-1 border-b border-border last:border-0">
                        {d.date} — {d.teacher}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => { setShowEcImport(false); setEcResult(null); }}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-sm font-medium transition-colors"
                >
                  {locale === "ko" ? "확인" : "OK"}
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-text-muted text-center">
                  {locale === "ko"
                    ? "English Channel 아이디/비밀번호를 입력하면 수업 피드백을 자동으로 노트에 추가합니다."
                    : "Enter your English Channel credentials to import lesson feedback."}
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder={locale === "ko" ? "아이디 (이메일)" : "Login ID (email)"}
                    value={ecLoginId}
                    onChange={(e) => setEcLoginId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-input border border-border rounded-xl text-sm text-text placeholder:text-text-faint focus:outline-none focus:border-primary"
                  />
                  <input
                    type="password"
                    placeholder={locale === "ko" ? "비밀번호" : "Password"}
                    value={ecPassword}
                    onChange={(e) => setEcPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-input border border-border rounded-xl text-sm text-text placeholder:text-text-faint focus:outline-none focus:border-primary"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ecSaveCredentials}
                      onChange={(e) => setEcSaveCredentials(e.target.checked)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-xs text-text-muted">
                      {locale === "ko"
                        ? "로그인 정보 저장 (앱 시작 시 자동 가져오기)"
                        : "Save credentials (auto-import on app start)"}
                    </span>
                  </label>
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => { setShowEcImport(false); if (!ecSaveCredentials) { setEcLoginId(""); setEcPassword(""); } }}
                    className="px-6 py-2.5 bg-bg-input hover:bg-bg-hover text-text-secondary rounded-xl text-sm transition-colors"
                  >
                    {locale === "ko" ? "취소" : "Cancel"}
                  </button>
                  <button
                    onClick={async () => {
                      if (!ecLoginId || !ecPassword || !user) return;
                      setEcImporting(true);
                      try {
                        // Get existing note dates to skip duplicates
                        const { data: existing } = await (await import("@/lib/supabase")).supabase
                          .from("study_sessions")
                          .select("study_date")
                          .eq("user_id", user.id)
                          .eq("language", "english");
                        const existingDates = (existing || []).map((n: { study_date: string }) => n.study_date);

                        const res = await fetch("/api/ec/import", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            ecLoginId,
                            ecPassword,
                            userId: user.id,
                            existingDates,
                          }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setEcResult(data);
                          if (ecSaveCredentials) {
                            localStorage.setItem("ec-login-id", ecLoginId);
                            localStorage.setItem("ec-password", ecPassword);
                            localStorage.setItem("ec-save-credentials", "true");
                          } else {
                            localStorage.removeItem("ec-login-id");
                            localStorage.removeItem("ec-password");
                            localStorage.removeItem("ec-save-credentials");
                          }
                        } else {
                          alert(data.error || "Import failed");
                        }
                      } catch {
                        alert(locale === "ko" ? "가져오기 중 오류가 발생했습니다." : "Import failed");
                      }
                      setEcImporting(false);
                    }}
                    disabled={ecImporting || !ecLoginId || !ecPassword}
                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-text rounded-xl text-sm font-medium transition-colors"
                  >
                    {ecImporting
                      ? (locale === "ko" ? "가져오는 중..." : "Importing...")
                      : (locale === "ko" ? "가져오기" : "Import")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth strict>
      <SettingsContent />
    </RequireAuth>
  );
}
