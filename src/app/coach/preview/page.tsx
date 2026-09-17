"use client";

import { useState } from "react";
import { Eye, Flame } from "lucide-react";
import { CoachProgramBuilder, type BuiltSession } from "@/components/coach-program-builder";
import { LIBRARY_BY_SLUG } from "@/lib/workout-library";
import { estimateSessionKcal } from "@/lib/workout";
import { fmtDate } from "@/lib/utils";

const DAYTYPE_LABEL: Record<string, string> = { strength: "Kuvvet", functional: "Fonksiyonel", cardio: "Kardiyo" };

export default function CoachPreviewPage() {
  const [sessions, setSessions] = useState<BuiltSession[]>([]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Koç Önizleme</h1>
      <p className="mt-1 text-sm text-ink-3">
        Solda koç gibi program kur, sağda danışanın nasıl gördüğünü anında izle. Bu bir deneme alanıdır.
      </p>
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-warn/30 bg-warn-wash px-3 py-1.5 text-xs font-medium text-warn">
        <Eye className="h-3.5 w-3.5" /> Önizleme — hiçbir şey kaydedilmez, gerçek veriyi/koç bağlantısını etkilemez.
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Koç: planlama */}
        <div className="card p-5">
          <div className="kicker mb-3">Koç · Haftalık program</div>
          <CoachProgramBuilder clientId="preview" onPreview={setSessions} />
        </div>

        {/* Danışan görünümü */}
        <div className="card p-5">
          <div className="kicker mb-3">Danışan görünümü</div>
          {sessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">Sol taraftan güne hareket ekle — burada canlı görünecek.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map((s) => {
                const setsForKcal = s.exercises.map((e) => {
                  const ex = LIBRARY_BY_SLUG[e.slug];
                  return { met: ex?.met ?? 4, phase: ex?.phase ?? "strength", targetSets: e.targetSets };
                });
                const kcal = estimateSessionKcal(setsForKcal, 80);
                return (
                  <div key={s.date + s.label} className="overflow-hidden rounded-xl border border-border">
                    <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-2 px-4 py-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={[
                            "rounded-lg px-2 py-0.5 text-xs font-bold",
                            s.dayType === "strength" ? "bg-primary/10 text-primary-ink" : "bg-accent/10 text-accent",
                          ].join(" ")}>{s.label}</span>
                          <span className="text-xs text-ink-3">{DAYTYPE_LABEL[s.dayType] ?? s.dayType}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-ink-3">{fmtDate(s.date, { weekday: "long", day: "numeric", month: "long" })}</div>
                      </div>
                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-ink-2">
                        <Flame className="h-3.5 w-3.5 text-warn" /> ~{kcal} kcal
                      </div>
                    </div>
                    <div className="divide-y divide-border/60">
                      {s.exercises.map((e, i) => {
                        const ex = LIBRARY_BY_SLUG[e.slug];
                        return (
                          <div key={i} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                            <span className="font-medium">{ex?.name ?? e.slug}</span>
                            <span className="shrink-0 tabular-nums text-ink-3">{e.targetSets}×{e.targetReps}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-ink-3">Danışan bunu Antrenman ekranında görür; setleri işaretleyip "Seansı tamamla" ya da "Bugün olmadı" der. Kalori otomatik hesaplanır.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
