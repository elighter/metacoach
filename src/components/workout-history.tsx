"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, fmt, fmtDate } from "@/lib/utils";

export interface RecentSession {
  id: string;
  label: string;
  source: string;
  completedAt: string;
  durationMin: number | null;
  estKcal: number | null;
}

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  imported: { label: "Apple Health", cls: "bg-primary-wash text-primary-ink" },
  coach: { label: "Koç", cls: "bg-good-wash text-good" },
  planned: { label: "Program", cls: "bg-ink/5 text-ink-3" },
};

const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function dateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function weekDaysOf(offset: number): Date[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = today.getDay();
  const mondayDelta = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayDelta + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const PAGE_SIZE = 10;

export function WorkoutHistory({ sessions }: { sessions: RecentSession[] }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(dateKey(new Date()));
  const [expanded, setExpanded] = useState(false);

  const byDate = useMemo(() => {
    const map = new Map<string, RecentSession[]>();
    for (const s of sessions) {
      const key = dateKey(s.completedAt);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [sessions]);

  const weekDays = useMemo(() => weekDaysOf(weekOffset), [weekOffset]);
  const todayKey = dateKey(new Date());

  const weekLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()}–${last.getDate()} ${MONTH_NAMES[first.getMonth()]}`;
    }
    return `${first.getDate()} ${MONTH_NAMES[first.getMonth()].slice(0, 3)} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()].slice(0, 3)}`;
  }, [weekDays]);

  const daySessions = byDate.get(selectedDate) ?? [];
  const visible = expanded ? daySessions : daySessions.slice(0, PAGE_SIZE);
  const hasMore = daySessions.length > PAGE_SIZE && !expanded;

  const dayStats = useMemo(() => {
    const dur = daySessions.reduce((s, v) => s + (v.durationMin ?? 0), 0);
    const kcal = daySessions.reduce((s, v) => s + (v.estKcal ?? 0), 0);
    return { count: daySessions.length, dur, kcal };
  }, [daySessions]);

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight">Antrenman geçmişi</h2>
      <p className="mt-0.5 text-sm text-ink-3">
        Tamamlanan seanslar &middot; program, koç ve Apple Health dahil tüm kaynaklar
      </p>

      <div className="mt-4 card overflow-hidden">
        {/* Week nav */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Önceki hafta"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">{weekLabel}</span>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            disabled={weekOffset >= 0}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30"
            aria-label="Sonraki hafta"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day strip */}
        <div className="grid grid-cols-7 border-b border-border/60">
          {weekDays.map((day, i) => {
            const key = dateKey(day);
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            const hasWorkouts = byDate.has(key);
            const isFuture = key > todayKey;

            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedDate(key);
                  setExpanded(false);
                }}
                disabled={isFuture}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 transition-colors",
                  isSelected ? "bg-primary/10" : "hover:bg-surface-2",
                  isFuture && "opacity-30",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wider",
                    isSelected ? "text-primary-ink" : "text-ink-3",
                  )}
                >
                  {DAY_NAMES[i]}
                </span>
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full text-sm font-semibold tabular-nums",
                    isSelected && "bg-primary text-white",
                    isToday && !isSelected && "ring-[1.5px] ring-primary/40",
                  )}
                >
                  {day.getDate()}
                </span>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    hasWorkouts ? "bg-primary-ink" : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* Day content */}
        <div className="p-4">
          {daySessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">Bu gün antrenman kaydı yok</p>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-4 text-xs text-ink-3">
                <span className="font-medium text-ink">
                  {dayStats.count} antrenman
                </span>
                {dayStats.dur > 0 && (
                  <span className="tabular-nums">{dayStats.dur} dk</span>
                )}
                {dayStats.kcal > 0 && (
                  <span className="tabular-nums">{fmt(Math.round(dayStats.kcal))} kcal</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {visible.map((s) => {
                  const badge = SOURCE_BADGE[s.source];
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/50 p-3.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{s.label}</span>
                          {badge && (
                            <span
                              className={cn(
                                "pill text-[10px]",
                                badge.cls,
                              )}
                            >
                              {badge.label}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-ink-3">
                          {fmtDate(s.completedAt, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-xs text-ink-2">
                        {s.durationMin ? (
                          <span className="tabular-nums">{s.durationMin} dk</span>
                        ) : null}
                        {s.estKcal ? (
                          <span className="ml-2 tabular-nums">
                            {fmt(Math.round(s.estKcal))} kcal
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <button
                  onClick={() => setExpanded(true)}
                  className="mt-3 w-full rounded-lg border border-border/50 py-2 text-center text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  Daha fazla göster ({daySessions.length - PAGE_SIZE} daha)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
