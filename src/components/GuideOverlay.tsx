"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GUIDE_STEPS, isGuideDismissed, dismissGuide, dismissTutorial, isTutorialActive, GuideStep } from "@/lib/guide";
import { useLocale } from "@/lib/useLocale";

const TUTORIAL_ORDER = [
  { key: "home", path: "/" },
  { key: "add", path: "/add" },
  { key: "review", path: "/review" },
  { key: "notes", path: "/notes" },
  { key: "nuance", path: "/nuance" },
];

type Annotation = {
  step: GuideStep;
  rect: DOMRect;
};

export default function GuideOverlay({ pageKey }: { pageKey: string }) {
  const { locale } = useLocale();
  const lang = locale === "ko" ? "ko" : "en";
  const steps = GUIDE_STEPS[pageKey];
  const router = useRouter();

  const [visible, setVisible] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const tutorialOn = isTutorialActive();
  const currentIdx = TUTORIAL_ORDER.findIndex((t) => t.key === pageKey);
  const prevStep = currentIdx > 0 ? TUTORIAL_ORDER[currentIdx - 1] : null;
  const nextStep = currentIdx >= 0 && currentIdx < TUTORIAL_ORDER.length - 1
    ? TUTORIAL_ORDER[currentIdx + 1]
    : null;
  const isLastStep = currentIdx === TUTORIAL_ORDER.length - 1;

  useEffect(() => {
    if (!steps || steps.length === 0) return;
    if (isGuideDismissed(pageKey)) return;
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, [pageKey]);

  const updateRects = useCallback(() => {
    if (!visible || !steps) return;
    const result: Annotation[] = [];
    for (const step of steps) {
      const el = document.querySelector(step.selector);
      if (el) {
        result.push({ step, rect: el.getBoundingClientRect() });
      }
    }
    setAnnotations(result);
  }, [visible, steps]);

  useEffect(() => {
    updateRects();
    window.addEventListener("resize", updateRects);
    window.addEventListener("scroll", updateRects, true);
    return () => {
      window.removeEventListener("resize", updateRects);
      window.removeEventListener("scroll", updateRects, true);
    };
  }, [updateRects]);

  function close() {
    if (!tutorialOn) {
      dismissGuide(pageKey);
    }
    setVisible(false);
  }

  if (!visible || annotations.length === 0) return null;

  const vh = window.innerHeight;
  const vw = window.innerWidth;

  return (
    <div
      className="fixed inset-0 z-[999]"
      style={{
        top: "calc(3.5rem + env(safe-area-inset-top))",
        bottom: "calc(3.5rem + env(safe-area-inset-bottom))",
      }}
      onClick={close}
    >
      {/* Semi-transparent overlay */}
      <div
        className="fixed inset-0 bg-black/70 z-[999]"
        style={{
          top: "calc(3.5rem + env(safe-area-inset-top))",
          bottom: "calc(3.5rem + env(safe-area-inset-bottom))",
        }}
      />

      {/* SVG curly arrows */}
      <svg className="fixed inset-0 w-full h-full z-[1001] pointer-events-none">
        <defs>
          <marker id="guide-arrow" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="7" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 4 L 0 8 z" fill="rgba(251,191,36,0.9)" />
          </marker>
          <marker id="guide-chevron" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M 2 1 L 5 5 L 2 9" fill="none" stroke="rgba(251,191,36,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        {annotations.map((a, i) => {
          if (a.step.overlay || a.step.tabLabels || a.step.noArrow) return null;
          const label = getLabelPos(a, i, vh, vw);
          const targetX = a.rect.left + a.rect.width / 2;
          const targetY = a.rect.top + Math.min(a.rect.height, vh * 0.5) / 2;
          const labelCX = label.x + label.w / 2;
          const labelCY = label.y + label.h / 2;

          const pos = a.step.position || "bottom";

          let startX: number, startY: number, endX: number, endY: number;
          let cp1X: number, cp1Y: number, cp2X: number, cp2Y: number;

          if (pos === "right") {
            const btnCX = a.rect.left + a.rect.width / 2;
            const btnTop = a.rect.top;
            const textX = label.x - 12;
            const textY = label.y + label.h / 2;

            const d = `M ${textX} ${textY} Q ${btnCX} ${textY}, ${btnCX} ${btnTop}`;

            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="rgba(251,191,36,0.7)"
                strokeWidth="2"
                strokeDasharray="5 4"
                strokeLinecap="round"
                markerEnd="url(#guide-chevron)"
              />
            );
          } else if (pos === "top-left") {
            const btnLeft = a.rect.left;
            const btnCY = a.rect.top + a.rect.height / 2;
            const textX = label.x;
            const textY = label.y + label.h;

            const d = `M ${textX} ${textY} Q ${textX} ${btnCY}, ${btnLeft} ${btnCY}`;

            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="rgba(251,191,36,0.7)"
                strokeWidth="2"
                strokeDasharray="5 4"
                strokeLinecap="round"
                markerEnd="url(#guide-chevron)"
              />
            );
          } else if (pos === "left") {
            const btnCX = a.rect.left + a.rect.width / 2;
            const btnTop = a.rect.top;
            const textX = label.x + label.w + 12;
            const textY = label.y + label.h / 2;

            const d = `M ${textX} ${textY} Q ${btnCX} ${textY}, ${btnCX} ${btnTop}`;

            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="rgba(251,191,36,0.7)"
                strokeWidth="2"
                strokeDasharray="5 4"
                strokeLinecap="round"
                markerEnd="url(#guide-chevron)"
              />
            );
          } else {
            const dx = targetX - labelCX;
            const dy = targetY - labelCY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 20) return null;

            startX = labelCX + (dx / dist) * (label.w / 2.5);
            startY = labelCY + (dy / dist) * (label.h / 2);
            endX = targetX;
            endY = a.rect.top - 4;

            // Curly/pigtail curve with two control points
            cp1X = startX + (endX - startX) * 0.1;
            cp1Y = startY + (endY - startY) * 0.7;
            cp2X = endX - (endX - startX) * 0.3;
            cp2Y = endY - 20;
          }

          return (
            <path
              key={i}
              d={`M ${startX} ${startY} C ${cp1X} ${cp1Y} ${cp2X} ${cp2Y} ${endX} ${endY}`}
              fill="none"
              stroke="rgba(251,191,36,0.7)"
              strokeWidth="2"
              strokeDasharray="3 3"
              markerEnd="url(#guide-arrow)"
            />
          );
        })}
      </svg>

      {/* Target element highlight */}
      {annotations.map((a, i) => {
        if (a.step.tabLabels || a.step.noHighlight) return null;
        return (
          <div
            key={`hl-${i}`}
            className="fixed z-[1000] rounded-lg pointer-events-none"
            style={{
              top: a.rect.top - 4,
              left: a.rect.left - 4,
              width: a.rect.width + 8,
              height: Math.min(a.rect.height + 8, vh * 0.5),
              border: "1.5px solid rgba(165,180,252,0.35)",
              boxShadow: "0 0 12px rgba(99,102,241,0.15)",
            }}
          />
        );
      })}

      {/* Tab labels */}
      {annotations.map((a, i) => {
        if (!a.step.tabLabels) return null;
        const tabEls = document.querySelectorAll("[data-guide-tab]");
        return Array.from(tabEls).map((el, ti) => {
          const tabRect = el.getBoundingClientRect();
          const label = el.getAttribute("data-guide-tab") || "";
          return (
            <div
              key={`tab-${i}-${ti}`}
              className="fixed z-[1002] pointer-events-none text-center"
              style={{
                top: tabRect.top,
                left: tabRect.left - 8,
                width: tabRect.width + 16,
                fontFamily: "var(--font-gaegu), cursive",
              }}
            >
              <span className="text-[14px] font-bold text-white whitespace-pre-line leading-tight">{label}</span>
            </div>
          );
        });
      })}

      {/* Labels */}
      {annotations.map((a, i) => {
        if (a.step.tabLabels) return null;
        if (a.step.overlay) {
          // Overlay: text on the element; position "top" = top 25%
          const elH = Math.min(a.rect.height, vh * 0.5);
          const alignItems = a.step.position === "top" || a.step.position === "bottom" ? "flex-start" : "center";
          const paddingTop = a.step.position === "top" ? elH * 0.1 : a.step.position === "bottom" ? elH * 0.6 : 0;
          const paddingBottom = 0;
          return (
            <div
              key={`label-${i}`}
              className="fixed z-[1002] pointer-events-none flex justify-center text-center"
              style={{
                top: a.rect.top,
                left: a.rect.left,
                width: a.rect.width,
                height: elH,
                alignItems,
                paddingTop,
                paddingBottom,
              }}
            >
              <div style={{ fontFamily: "var(--font-gaegu), cursive" }}>
                {a.step.title[lang] && <p className="text-[18px] font-bold text-amber-300">{a.step.title[lang]}</p>}
                {a.step.description[lang] && <p className={`text-[15px] text-white leading-relaxed whitespace-pre-line ${a.step.title[lang] ? "mt-1" : ""}`}>{renderDesc(a.step.description[lang])}</p>}
              </div>
            </div>
          );
        }
        const label = getLabelPos(a, i, vh, vw);
        return (
          <div
            key={`label-${i}`}
            className="fixed z-[1002] pointer-events-none flex items-center"
            style={{ top: label.y, left: label.x, width: label.w, height: label.h }}
          >
            <div style={{ fontFamily: "var(--font-gaegu), cursive" }}>
              {a.step.title[lang] && <p className="text-[17px] font-bold text-amber-300 leading-snug">{a.step.title[lang]}</p>}
              {a.step.description[lang] && (
                <p className={`text-[15px] text-white leading-relaxed whitespace-pre-line ${a.step.title[lang] ? "mt-1" : ""}`}>{renderDesc(a.step.description[lang])}</p>
              )}
            </div>
          </div>
        );
      })}

      {/* Tutorial next/done button */}
      {tutorialOn && (
        <div
          className="fixed left-0 right-0 z-[1002] flex justify-center pointer-events-none"
          style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
        >
          <div className="flex flex-col items-center gap-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { if (prevStep) { close(); router.push(prevStep.path); } }}
                disabled={!prevStep}
                className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                  prevStep
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                    : "bg-gray-800/50 text-gray-600 cursor-not-allowed"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                {lang === "ko" ? "이전" : "Prev"}
              </button>
              {isLastStep ? (
                <button
                  onClick={() => {
                    dismissTutorial();
                    close();
                    alert(lang === "ko"
                      ? "감사합니다!\n가이드는 설정에서 다시 켤 수 있습니다."
                      : "Thank you!\nYou can turn the guide back on in Settings.");
                  }}
                  className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {lang === "ko" ? "완료" : "Done"}
                </button>
              ) : (
                <button
                  onClick={() => { if (nextStep) { close(); router.push(nextStep.path); } }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {lang === "ko" ? "다음" : "Next"}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Calculate label position for each annotation */
function getLabelPos(
  a: Annotation,
  _index: number,
  vh: number,
  vw: number,
): { x: number; y: number; w: number; h: number } {
  const labelW = Math.min(220, vw - 32);
  const labelH = 56;
  const gap = 16;
  const pos = a.step.position || "bottom";
  const rect = a.rect;

  let x: number;
  let y: number;

  if (pos === "right") {
    const btnCenterX = rect.left + rect.width / 2;
    x = btnCenterX + 40;
    const y2 = rect.top - labelH - 20;
    const rightW = vw - x - 20;
    return { x, y: y2, w: Math.max(rightW, 140), h: labelH };
  } else if (pos === "left") {
    const btnCenterX = rect.left + rect.width / 2;
    const leftW = Math.max(btnCenterX - 20 - 16, 140);
    x = btnCenterX - 20 - leftW;
    const y2 = rect.top - labelH;
    return { x: Math.max(16, x), y: y2, w: leftW, h: labelH };
  } else if (pos === "top-left") {
    x = Math.max(16, rect.right - labelW);
    y = rect.top - labelH;
    return { x, y, w: labelW, h: labelH };
  } else if (pos === "top") {
    x = a.step.noArrow ? Math.max(16, rect.right - labelW) : Math.max(16, Math.min(rect.left, vw - labelW - 16));
    y = rect.top - labelH - (a.step.noArrow ? 0 : gap);
  } else if (pos === "center") {
    x = Math.max(16, rect.left + (rect.width - labelW) / 2);
    y = rect.top + Math.min(rect.height, vh * 0.5) / 2 - labelH / 2;
  } else {
    x = Math.max(16, Math.min(rect.left, vw - labelW - 16));
    y = rect.top + Math.min(rect.height, vh * 0.5) + gap;
  }

  // Clamp within viewport
  y = Math.max(16, Math.min(y, vh - labelH - 70));
  x = Math.max(16, Math.min(x, vw - labelW - 16));

  return { x, y, w: labelW, h: labelH };
}

/** Render description text, replacing [+] with a styled icon */
function renderDesc(text: string) {
  const parts = text.split(/(\[\+\])/);
  return parts.map((part, i) =>
    part === "[+]" ? (
      <span
        key={i}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600/40 text-indigo-300 border border-indigo-500/50 text-xs font-bold align-middle mx-0.5"
      >
        +
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}
