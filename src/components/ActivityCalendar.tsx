"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useLocale } from "@/lib/useLocale";
import type { DailyActivity } from "@/lib/streak";

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Props = {
  activities: DailyActivity[];
  streak: number;
};

function getLeafLevel(a: DailyActivity): number {
  const total = a.cards_reviewed + a.notes_added * 5 + a.nuance_used * 3;
  if (total === 0) return 0;
  if (total < 5) return 1;
  if (total < 10) return 2;
  if (total < 20) return 3;
  return 4;
}

const LEAF_COLORS = [
  "", // 0
  "text-green-300/60", // 1
  "text-green-400/80", // 2
  "text-green-500/90", // 3
  "text-green-500", // 4
];

type DayCell = {
  date: string;
  day: number; // day of month
  level: number;
  isToday: boolean;
  isFuture: boolean;
  isCurrentMonth: boolean;
  activity?: DailyActivity;
};

export default function ActivityCalendar({ activities, streak }: Props) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const [selectedDay, setSelectedDay] = useState<DayCell | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, -1 = last month

  useEffect(() => {
    if (!selectedDay) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setSelectedDay(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [selectedDay]);

  const { weeks, monthLabel } = useMemo(() => {
    const now = new Date();
    const viewMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toLocalDateStr(today);

    const activityMap = new Map<string, DailyActivity>();
    for (const a of activities) {
      activityMap.set(a.activity_date, a);
    }

    // First day of month and last day
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay(); // 0=Sun

    const weeksArr: DayCell[][] = [];
    let currentWeek: DayCell[] = [];

    // Fill leading empty days from previous month
    for (let i = 0; i < startDow; i++) {
      const d = new Date(year, month, -(startDow - 1 - i));
      const dateStr = toLocalDateStr(d);
      const activity = activityMap.get(dateStr);
      currentWeek.push({
        date: dateStr,
        day: d.getDate(),
        level: activity ? getLeafLevel(activity) : 0,
        isToday: dateStr === todayStr,
        isFuture: d > today,
        isCurrentMonth: false,
        activity,
      });
    }

    // Fill actual month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = toLocalDateStr(date);
      const activity = activityMap.get(dateStr);
      currentWeek.push({
        date: dateStr,
        day: d,
        level: activity ? getLeafLevel(activity) : 0,
        isToday: dateStr === todayStr,
        isFuture: date > today,
        isCurrentMonth: true,
        activity,
      });
      if (currentWeek.length === 7) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill trailing days
    if (currentWeek.length > 0) {
      let nextDay = 1;
      while (currentWeek.length < 7) {
        const d = new Date(year, month + 1, nextDay);
        const dateStr = toLocalDateStr(d);
        const activity = activityMap.get(dateStr);
        currentWeek.push({
          date: dateStr,
          day: nextDay,
          level: activity ? getLeafLevel(activity) : 0,
          isToday: dateStr === todayStr,
          isFuture: d > today,
          isCurrentMonth: false,
          activity,
        });
        nextDay++;
      }
      weeksArr.push(currentWeek);
    }

    const label = viewMonth.toLocaleDateString(isKo ? "ko-KR" : "en-US", { year: "numeric", month: "long" });
    return { weeks: weeksArr, monthLabel: label };
  }, [activities, isKo, monthOffset]);

  const dayHeaders = isKo
    ? ["일", "월", "화", "수", "목", "금", "토"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const canGoNext = monthOffset < 0;

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(isKo ? "ko-KR" : "en-US", { month: "short", day: "numeric", weekday: "short" });
  }

  return (
    <div ref={containerRef} className="bg-bg-card border border-border rounded-xl p-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setMonthOffset((m) => m - 1); setSelectedDay(null); }}
            className="p-1 rounded hover:bg-bg-hover text-text-muted transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="text-sm font-semibold text-text min-w-[120px] text-center">{monthLabel}</span>
          <button
            onClick={() => { if (canGoNext) { setMonthOffset((m) => m + 1); setSelectedDay(null); } }}
            className={`p-1 rounded transition-colors ${canGoNext ? "hover:bg-bg-hover text-text-muted" : "text-text-faint/30 cursor-default"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
        {streak > 0 && (
          <span className="text-sm font-bold text-blue-400">
            💧 {streak}{isKo ? "일 연속" : "d streak"}
          </span>
        )}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map((d, i) => (
          <div key={i} className={`text-center text-[10px] font-medium py-1 ${i === 0 ? "text-red-400/70" : i === 6 ? "text-blue-400/70" : "text-text-faint"}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day) => {
              const dow = new Date(day.date + "T00:00:00").getDay();
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={(e) => {
                    if (day.isFuture || !day.isCurrentMonth) return;
                    if (selectedDay?.date === day.date) { setSelectedDay(null); return; }
                    const btn = e.currentTarget;
                    const container = containerRef.current;
                    if (container) {
                      const cr = container.getBoundingClientRect();
                      const br = btn.getBoundingClientRect();
                      setPopupPos({
                        x: br.left + br.width / 2 - cr.left,
                        y: br.top - cr.top,
                      });
                    }
                    setSelectedDay(day);
                  }}
                  className={`relative flex flex-col items-center justify-center rounded-lg transition-all aspect-square md:aspect-auto md:py-1.5 ${
                    !day.isCurrentMonth ? "opacity-30 cursor-default" :
                    day.isFuture ? "opacity-30 cursor-default" :
                    "cursor-pointer hover:bg-bg-hover/50"
                  } ${day.isToday ? "ring-1.5 ring-primary bg-primary/5" : ""} ${
                    selectedDay?.date === day.date ? "bg-primary/10 ring-1 ring-primary" : ""
                  }`}
                >
                  <span className={`text-[10px] leading-none ${
                    day.isToday ? "font-bold text-primary" :
                    !day.isCurrentMonth ? "text-text-faint/50" :
                    dow === 0 ? "text-red-400/70" :
                    dow === 6 ? "text-blue-400/70" :
                    "text-text-faint"
                  }`}>
                    {day.day}
                  </span>
                  {day.level > 0 && day.isCurrentMonth ? (
                    <svg
                      viewBox="0 0 24 24"
                      className={`w-4 h-4 mt-0.5 ${LEAF_COLORS[day.level]}`}
                      fill="currentColor"
                    >
                      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
                    </svg>
                  ) : (
                    <div className="w-4 h-4 mt-0.5" />
                  )}
                  {/* PC: show activity details inside cell */}
                  {day.activity && day.isCurrentMonth && !day.isFuture && (
                    <div className="hidden md:flex flex-col items-center gap-0 mt-0.5">
                      {day.activity.cards_reviewed > 0 && (
                        <span className="text-[8px] text-text-faint leading-tight">{isKo ? "카" : "C"}{day.activity.cards_reviewed}</span>
                      )}
                      {day.activity.notes_added > 0 && (
                        <span className="text-[8px] text-text-faint leading-tight">{isKo ? "노" : "N"}{day.activity.notes_added}</span>
                      )}
                      {day.activity.leaf_earned > 0 && (
                        <span className="text-[8px] text-green-500/80 leading-tight font-medium">+{day.activity.leaf_earned}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-text-faint">{isKo ? "적음" : "Less"}</span>
          {[1, 2, 3, 4].map((level) => (
            <svg key={level} viewBox="0 0 24 24" className={`w-3 h-3 ${LEAF_COLORS[level]}`} fill="currentColor">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
            </svg>
          ))}
          <span className="text-[9px] text-text-faint">{isKo ? "많음" : "More"}</span>
        </div>
        {monthOffset !== 0 && (
          <button
            onClick={() => { setMonthOffset(0); setSelectedDay(null); }}
            className="text-[10px] text-primary hover:underline"
          >
            {isKo ? "이번 달" : "This month"}
          </button>
        )}
      </div>

      {/* Day detail popup (positioned above clicked date) */}
      {selectedDay && (
        <div
          ref={popupRef}
          className="absolute z-20 animate-fade-in-down"
          style={{
            left: `clamp(90px, ${popupPos.x}px, calc(100% - 90px))`,
            top: `${popupPos.y - 8}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-bg-nav border border-border rounded-xl shadow-lg p-3 min-w-[170px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text">{formatDate(selectedDay.date)}</span>
              <button onClick={() => setSelectedDay(null)} className="text-text-faint hover:text-text text-[10px] ml-2">✕</button>
            </div>
            {selectedDay.activity ? (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">{isKo ? "카드 복습" : "Cards"}</span>
                  <span className="font-medium text-text">{selectedDay.activity.cards_reviewed}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">{isKo ? "노트 추가" : "Notes"}</span>
                  <span className="font-medium text-text">{selectedDay.activity.notes_added}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Nuance</span>
                  <span className="font-medium text-text">{selectedDay.activity.nuance_used}</span>
                </div>
                {selectedDay.activity.leaf_earned > 0 && (
                  <div className="flex justify-between text-xs border-t border-border pt-1 mt-1">
                    <span className="text-text-muted">Leaf</span>
                    <span className="font-medium text-green-500">+{selectedDay.activity.leaf_earned}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-text-faint">{isKo ? "활동 없음" : "No activity"}</div>
            )}
          </div>
          {/* Arrow pointing down to the date */}
          <div className="flex justify-center">
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-border" />
          </div>
        </div>
      )}
    </div>
  );
}
