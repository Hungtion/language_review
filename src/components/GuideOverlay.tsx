"use client";

import { useState, useEffect, useCallback } from "react";
import { GUIDE_STEPS, isGuideDismissed, dismissGuide, GuideStep } from "@/lib/guide";
import { useLocale } from "@/lib/useLocale";

type Annotation = {
  step: GuideStep;
  rect: DOMRect;
};

export default function GuideOverlay({ pageKey }: { pageKey: string }) {
  const { locale } = useLocale();
  const lang = locale === "ko" ? "ko" : "en";
  const steps = GUIDE_STEPS[pageKey];

  const [visible, setVisible] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // One-time migration: reset old tutorial dismiss keys for new per-page guide
  useEffect(() => {
    if (localStorage.getItem("guide-v2-migrated")) return;
    ["home", "add", "review", "notes", "nuance"].forEach((k) =>
      localStorage.removeItem(`guide-dismissed-${k}`)
    );
    localStorage.setItem("guide-v2-migrated", "true");
  }, []);

  // Auto-show on first visit (not dismissed)
  useEffect(() => {
    if (!steps || steps.length === 0) return;
    if (isGuideDismissed(pageKey)) return;
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, [pageKey, steps]);

  // Listen for Nav help button
  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener("show-guide", handler);
    return () => window.removeEventListener("show-guide", handler);
  }, []);

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

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("guide-visible", { detail: visible }));
    return () => {
      window.dispatchEvent(new CustomEvent("guide-visible", { detail: false }));
    };
  }, [visible]);

  function close() {
    setVisible(false);
  }

  function closeAndDismiss() {
    dismissGuide(pageKey);
    setVisible(false);
  }

  if (!visible) return null;

  const vh = window.innerHeight;
  const vw = window.innerWidth;

  return (
    <>
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

            const pos = a.step.position || "bottom";

            if (pos === "right") {
              const btnCX = a.rect.left + a.rect.width / 2;
              const btnTop = a.rect.top;
              const textX = label.x - 12;
              const textY = label.y + label.h / 2;
              const d = `M ${textX} ${textY} Q ${btnCX} ${textY}, ${btnCX} ${btnTop}`;
              return (
                <path key={i} d={d} fill="none" stroke="rgba(251,191,36,0.7)" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" markerEnd="url(#guide-chevron)" />
              );
            } else if (pos === "top-left") {
              const btnLeft = a.rect.left;
              const btnCY = a.rect.top + a.rect.height / 2;
              const textX = label.x;
              const textY = label.y + label.h;
              const d = `M ${textX} ${textY} Q ${textX} ${btnCY}, ${btnLeft} ${btnCY}`;
              return (
                <path key={i} d={d} fill="none" stroke="rgba(251,191,36,0.7)" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" markerEnd="url(#guide-chevron)" />
              );
            } else if (pos === "left") {
              const btnCX = a.rect.left + a.rect.width / 2;
              const btnTop = a.rect.top;
              const textX = label.x + label.w + 12;
              const textY = label.y + label.h / 2;
              const d = `M ${textX} ${textY} Q ${btnCX} ${textY}, ${btnCX} ${btnTop}`;
              return (
                <path key={i} d={d} fill="none" stroke="rgba(251,191,36,0.7)" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" markerEnd="url(#guide-chevron)" />
              );
            } else {
              const startPtX = a.rect.left + 20;
              const startPtY = a.rect.top + a.rect.height + 4;
              const cornerY = label.y + label.h / 2;
              const endPtX = label.x - 6;
              const r = 12;
              const d = `M ${startPtX} ${startPtY} L ${startPtX} ${cornerY - r} Q ${startPtX} ${cornerY}, ${startPtX + r} ${cornerY} L ${endPtX} ${cornerY}`;
              return (
                <path key={i} d={d} fill="none" stroke="rgba(251,191,36,0.7)" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" markerEnd="url(#guide-chevron)" />
              );
            }
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
                height: a.rect.height + 8,
                border: "1.5px solid rgba(165,180,252,0.35)",
                boxShadow: "0 0 12px rgba(99,102,241,0.15)",
              }}
            />
          );
        })}

        {/* Tab labels */}
        {annotations.map((a, i) => {
          if (!a.step.tabLabels) return null;
          const parent = document.querySelector(a.step.selector);
          const tabEls = parent ? parent.querySelectorAll("[data-guide-tab]") : [];
          return Array.from(tabEls).map((el, ti) => {
            const tabRect = el.getBoundingClientRect();
            const tabLabel = (lang === "en" ? el.getAttribute("data-guide-tab-en") : null) || el.getAttribute("data-guide-tab") || "";
            return (
              <div key={`tab-${i}-${ti}`} className="contents">
                <div
                  className="fixed z-[1000] rounded-lg pointer-events-none"
                  style={{
                    top: tabRect.top - 4,
                    left: tabRect.left - 4,
                    width: tabRect.width + 8,
                    height: tabRect.height + 8,
                    border: "1.5px solid rgba(165,180,252,0.35)",
                    boxShadow: "0 0 12px rgba(99,102,241,0.15)",
                  }}
                />
                <div
                  className="fixed z-[1002] pointer-events-none text-center flex items-center justify-center"
                  style={{
                    top: tabRect.top,
                    left: tabRect.left - 8,
                    width: tabRect.width + 16,
                    height: tabRect.height,
                    fontFamily: "var(--font-gaegu), cursive",
                  }}
                >
                  <span className="text-[16px] font-bold text-white whitespace-pre-line leading-tight">{tabLabel}</span>
                </div>
              </div>
            );
          });
        })}

        {/* Labels */}
        {annotations.map((a, i) => {
          if (a.step.tabLabels) return null;
          if (a.step.overlay) {
            const elH = Math.min(a.rect.height, vh * 0.5);
            const alignItems = a.step.position === "top" || a.step.position === "bottom" ? "flex-start" : "center";
            const paddingTop = a.step.position === "top" ? elH * 0.2 : a.step.position === "bottom" ? elH * 0.6 : 0;
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
                }}
              >
                <div style={{ fontFamily: "var(--font-gaegu), cursive" }}>
                  {a.step.title[lang] && <p className="text-[20px] font-bold text-amber-300">{a.step.title[lang]}</p>}
                  {a.step.description[lang] && <p className={`text-white leading-tight whitespace-pre-line ${a.step.title[lang] ? "mt-1" : ""}`} style={{ fontSize: a.step.fontSize || 17 }}>{renderDesc(a.step.description[lang])}</p>}
                </div>
              </div>
            );
          }
          const label = getLabelPos(a, i, vh, vw);
          const alignRight = a.step.position === "bottom-right";
          return (
            <div
              key={`label-${i}`}
              className={`fixed z-[1002] pointer-events-none flex items-center ${alignRight ? "justify-end text-right" : ""}`}
              style={{ top: label.y, left: label.x, width: label.w, height: label.h }}
            >
              <div style={{ fontFamily: "var(--font-gaegu), cursive" }}>
                {a.step.title[lang] && <p className="text-[19px] font-bold text-amber-300 leading-snug">{a.step.title[lang]}</p>}
                {a.step.description[lang] && (
                  <p className={`text-[17px] text-white leading-relaxed whitespace-pre-line ${a.step.title[lang] ? "mt-1" : ""}`}>{renderDesc(a.step.description[lang])}</p>
                )}
              </div>
            </div>
          );
        })}

        {/* Bottom: dismiss button */}
        <div
          className="fixed left-0 right-0 z-[1002] flex justify-center pointer-events-none"
          style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
        >
          <div className="flex flex-col items-center gap-3 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {!isGuideDismissed(pageKey) && (
              <button
                onClick={closeAndDismiss}
                className="px-4 py-1.5 rounded-full text-xs text-white/70 hover:text-white border border-white/20 hover:border-white/40 bg-white/10 transition-colors"
              >
                {lang === "ko" ? "다시 보지 않기" : "Don't show again"}
              </button>
            )}
            <p className="text-sm text-white/60 animate-pulse" style={{ fontFamily: "var(--font-gaegu), cursive" }}>
              {lang === "ko" ? "아무 곳이나 터치하여 닫기" : "Tap anywhere to close"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function getLabelPos(
  a: Annotation,
  _index: number,
  vh: number,
  vw: number,
): { x: number; y: number; w: number; h: number } {
  const labelW = Math.min(300, vw - 32);
  const labelH = 56;
  const gap = 0;
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
  } else if (pos === "bottom-right") {
    x = Math.max(16, rect.right - labelW);
    y = rect.top + Math.min(rect.height, vh * 0.5) + gap;
  } else {
    x = Math.max(16, Math.min(rect.left + 56, vw - labelW - 16));
    y = rect.top + Math.min(rect.height, vh * 0.5) + gap;
  }

  y = Math.max(16, Math.min(y, vh - labelH - 70));
  x = Math.max(16, Math.min(x, vw - labelW - 16));

  return { x, y, w: labelW, h: labelH };
}

function renderDesc(text: string) {
  const parts = text.split(/(\[\+\])/);
  return parts.map((part, i) =>
    part === "[+]" ? (
      <span
        key={i}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/40 text-primary border border-primary/50 text-xs font-bold align-middle mx-0.5"
      >
        +
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}
