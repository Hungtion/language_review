"use client";

import { useMemo } from "react";
import { useLocale } from "@/lib/useLocale";
import type { DailyActivity } from "@/lib/streak";

type Props = {
  activities: DailyActivity[];
  streak: number;
};

function isStudyDay(a: DailyActivity): boolean {
  return a.notes_added >= 1 || a.cards_reviewed >= 5 || a.nuance_used >= 1;
}

function getLeafLevel(a: DailyActivity): number {
  const total = a.cards_reviewed + a.notes_added * 5 + a.nuance_used * 3;
  if (total === 0) return 0;
  if (total < 5) return 1;
  if (total < 10) return 2;
  if (total < 20) return 3;
  return 4;
}

const LEAF_STYLES = [
  "", // 0: no activity
  "text-green-300/50 scale-[0.6]", // 1: seedling
  "text-green-400/70 scale-[0.75]", // 2: small leaf
  "text-green-500/85 scale-[0.9]", // 3: medium leaf
  "text-green-500 scale-100", // 4: full leaf
];

export default function ActivityCalendar({ activities, streak }: Props) {
  const { locale } = useLocale();
  const isKo = locale === "ko";

  const { weeks, monthLabel } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activityMap = new Map<string, DailyActivity>();
    for (const a of activities) {
      activityMap.set(a.activity_date, a);
    }

    // Build 12 weeks (84 days) of data
    const totalDays = 84;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalDays + 1);
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weeksArr: { date: string; level: number; isToday: boolean; isFuture: boolean }[][] = [];
    const current = new Date(startDate);
    const todayStr = today.toISOString().split("T")[0];

    while (current <= today || weeksArr.length === 0 || weeksArr[weeksArr.length - 1].length < 7) {
      if (weeksArr.length === 0 || weeksArr[weeksArr.length - 1].length === 7) {
        weeksArr.push([]);
      }
      const dateStr = current.toISOString().split("T")[0];
      const activity = activityMap.get(dateStr);
      const isFuture = current > today;
      weeksArr[weeksArr.length - 1].push({
        date: dateStr,
        level: activity && isStudyDay(activity) ? getLeafLevel(activity) : 0,
        isToday: dateStr === todayStr,
        isFuture,
      });
      current.setDate(current.getDate() + 1);
    }

    const month = today.toLocaleDateString(isKo ? "ko-KR" : "en-US", { year: "numeric", month: "long" });

    return { weeks: weeksArr, monthLabel: month };
  }, [activities, isKo]);

  const dayLabels = isKo ? ["일", "월", "화", "수", "목", "금", "토"] : ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span className="text-sm font-bold text-orange-400">
              {streak}{isKo ? "일 연속" : "d streak"}
            </span>
          )}
        </div>
        <span className="text-xs text-text-faint">{monthLabel}</span>
      </div>

      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1">
          {dayLabels.map((d, i) => (
            <div key={i} className="w-3 h-3 flex items-center justify-center">
              {i % 2 === 1 && <span className="text-[8px] text-text-faint leading-none">{d}</span>}
            </div>
          ))}
        </div>

        {/* Weeks grid */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day) => (
              <div
                key={day.date}
                className={`w-3 h-3 rounded-[2px] flex items-center justify-center transition-all ${
                  day.isToday ? "ring-1 ring-primary ring-offset-1 ring-offset-bg-card" : ""
                } ${day.isFuture ? "opacity-20" : ""}`}
                title={`${day.date}${day.level > 0 ? " ✓" : ""}`}
              >
                {day.level > 0 ? (
                  <svg
                    viewBox="0 0 24 24"
                    className={`w-3 h-3 transition-all ${LEAF_STYLES[day.level]}`}
                    fill="currentColor"
                  >
                    <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
                  </svg>
                ) : (
                  <div className={`w-2.5 h-2.5 rounded-[2px] ${day.isFuture ? "bg-transparent" : "bg-bg-hover/40"}`} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-2">
        <span className="text-[9px] text-text-faint">{isKo ? "적음" : "Less"}</span>
        {[1, 2, 3, 4].map((level) => (
          <svg key={level} viewBox="0 0 24 24" className={`w-2.5 h-2.5 ${LEAF_STYLES[level]}`} fill="currentColor">
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
          </svg>
        ))}
        <span className="text-[9px] text-text-faint">{isKo ? "많음" : "More"}</span>
      </div>
    </div>
  );
}
