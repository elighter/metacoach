"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dumbbell, Sparkles, Loader2, CheckCircle2, Circle, Flame,
  CalendarDays, RefreshCw, Zap, Info,
} from "lucide-react";
import { cn, fmtDate } from "@/lib/utils";
import type { DayType } from "@/lib/workout";

export interface SetView {
  id: string;
  name: string;
  instruction: string | null;
  equipment: string;
  targetSets: number;
  targetReps: string;
  weightKg: number | null;
  done: boolean;
  showWeight: boolean;
}
export interface PhaseView {
  phase: string;
  label: string;
  hint: string;
  sets: SetView[];
}
export interface SessionView {
  id: string;
  label: string;
  dayType: DayType;
  status: string;
  scheduledFor: string;
  estKcal: number | null;
  durationMin: number | null;
  phases: PhaseView[];
}

interface Props {
  program: { name: string; source: string; notes: string | null } | null;
  current: SessionView | null;
  upcoming: { id: string; label: string; status: string; scheduledFor: string }[];
  proteinNote: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  planned: "Planlandı",
  in_progress: "Devam ediyor",
  completed: "Tamamlandı",
  skipped: "Atlandı",
};

export function WorkoutClient({ program, current, upcoming, proteinNote }: Props) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [sets, setSets] = useState<Record<string, { done: boolean; weightKg: number | null }>>(
    () =>
      Object.fromEntries(
        (current?.phases ?? []).flatMap((p) => p.sets.map((s) => [s.id, { done: s.done, weightKg: s.weightKg }])),
      ),
  );
  const [completing, setCompleting] = useState(false);
  const [skipping, setSkipping] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/workouts/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) router.refresh();
    } finally {
      setGenerating(false);
    }
  }

  async function toggleSet(id: string) {
    const next = !sets[id]?.done;
    setSets((prev) => ({ ...prev, [id]: { ...prev[id], done: next } }));
    await fetch(`/api/workouts/set/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ done: next }),
    }).catch(() => {});
  }

  async function setWeight(id: string, value: number | null) {
    setSets((prev) => ({ ...prev, [id]: { ...prev[id], weightKg: value } }));
    await fetch(`/api/workouts/set/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ weightKg: value }),
    }).catch(() => {});
  }

  async function completeSession() {
    if (!current) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/workouts/session/${current.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) router.refresh();
    } finally {
      setCompleting(false);
    }
  }

  async function skipSession() {
    if (!current) return;
    setSkipping(true);
    try {
      const res = await fetch(`/api/workouts/session/${current.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "skipped" }),
      });
      if (res.ok) router.refresh();
    } finally {
      setSkipping(false);
    }
  }

  const allSets = current?.phases.flatMap((p) => p.sets) ?? [];
  const doneCount = allSets.filter((s) => sets[s.id]?.done).length;
  const progress = allSets.length ? Math.round((doneCount / allSets.length) * 100) : 0;

  // ── Empty state: no program yet ──
  if (!program || !current) {
    return (
      <div className="mt-6 card p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10">
          <Dumbbell className="h-6 w-6 text-primary-ink" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Henüz bir programın yok</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-3">
          Hedefine (kesim/koruma/kütle) ve son ölçümlerine göre 3 günlük, A/B dönüşümlü, 4 fazlı bir program oluşturalım.
        </p>
        <button onClick={generate} disabled={generating} className="btn-primary mx-auto mt-5 inline-flex items-center gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Oluşturuluyor…" : "Program oluştur"}
        </button>
      </div>
    );
  }

  const isCompleted = current.status === "completed";

  return (
    <div className="mt-5 space-y-4">
      {/* Program header */}
      <div className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{program.name}</h2>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                program.source === "ai" ? "bg-primary/10 text-primary-ink" : "bg-ink/5 text-ink-3",
              )}>
                {program.source === "ai" ? "AI" : "Şablon"}
              </span>
            </div>
            {program.notes && <p className="mt-1 max-w-xl text-sm text-ink-3">{program.notes}</p>}
          </div>
          {program.source === "coach" ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-ink">Koç programı</span>
          ) : (
            <button onClick={generate} disabled={generating} className="btn-ghost inline-flex items-center gap-1.5 text-sm">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Yenile
            </button>
          )}
        </div>
      </div>

      {/* Today's session */}
      <div className="card overflow-hidden">
        <div className="border-b border-border/60 bg-surface-2/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "rounded-lg px-2 py-0.5 text-xs font-bold",
                  current.dayType === "strength" ? "bg-primary/10 text-primary-ink" : "bg-accent/10 text-accent",
                )}>
                  {current.label}
                </span>
                <span className="text-xs text-ink-3">{fmtDate(current.scheduledFor, { weekday: "long", day: "numeric", month: "long" })}</span>
              </div>
              <div className="mt-1.5 text-xs font-medium text-ink-3">{STATUS_LABEL[current.status]}</div>
            </div>
            {!isCompleted && (
              <div className="text-right">
                <div className="text-xs text-ink-3">{doneCount}/{allSets.length} hareket</div>
                <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-ink/10">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {isCompleted ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="mx-auto h-9 w-9 text-primary-ink" />
            <p className="mt-2 font-semibold">Seans tamamlandı 💪</p>
            {current.estKcal != null && (
              <p className="mt-1 text-sm text-ink-3">
                Tahmini ~{current.estKcal} kcal · {current.durationMin} dk
              </p>
            )}
            <div className="mx-auto mt-3 flex max-w-md items-start gap-2 rounded-xl bg-ink/[0.03] p-3 text-left text-xs text-ink-3">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Bu kalori tahmini sadece motivasyon içindir. Dynamic TDEE motoru gerçek harcamayı zaten kilo değişiminden öğreniyor — çift sayım yapılmaz.</span>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {/* Adaptive protein nudge */}
            {proteinNote && (
              <div className="flex items-start gap-2 bg-accent/[0.06] px-4 py-2.5 text-xs text-ink-2">
                <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                <span>{proteinNote}</span>
              </div>
            )}

            {current.phases.map((phase) => (
              <div key={phase.phase} className="p-4">
                <div className="text-sm font-semibold">{phase.label}</div>
                <p className="mt-0.5 text-xs text-ink-3">{phase.hint}</p>
                <div className="mt-3 space-y-1.5">
                  {phase.sets.map((s) => {
                    const st = sets[s.id];
                    return (
                      <div key={s.id} className={cn(
                        "flex items-center gap-3 rounded-xl border border-border/50 p-2.5 transition-colors",
                        st?.done && "border-primary/30 bg-primary/[0.04]",
                      )}>
                        <button onClick={() => toggleSet(s.id)} className="shrink-0" aria-label="Tamamlandı">
                          {st?.done
                            ? <CheckCircle2 className="h-5 w-5 text-primary-ink" />
                            : <Circle className="h-5 w-5 text-ink-3/50" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className={cn("text-sm font-medium", st?.done && "text-ink-3 line-through")}>{s.name}</div>
                          {s.instruction && <div className="truncate text-xs text-ink-3">{s.instruction}</div>}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs font-semibold tabular-nums text-ink-2">
                            {s.targetSets}×{s.targetReps}
                          </div>
                          {s.showWeight && (
                            <input
                              type="number"
                              inputMode="decimal"
                              placeholder="kg"
                              defaultValue={st?.weightKg ?? ""}
                              onBlur={(e) => {
                                const v = e.target.value === "" ? null : Number(e.target.value);
                                setWeight(s.id, v);
                              }}
                              className="mt-1 w-16 rounded-lg border border-border bg-surface px-2 py-1 text-right text-xs tabular-nums outline-none focus:border-primary"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex gap-2 p-4">
              <button onClick={completeSession} disabled={completing || skipping} className="btn-primary inline-flex flex-1 items-center justify-center gap-2">
                {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
                Seansı tamamla
              </button>
              <button onClick={skipSession} disabled={completing || skipping} className="btn inline-flex items-center justify-center gap-2" title="Bugün gerçekleşmediyse atla">
                {skipping ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Bugün olmadı
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-ink-3" /> Sıradaki seanslar
          </div>
          <div className="mt-3 space-y-1.5">
            {upcoming.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg bg-ink/[0.02] px-3 py-2 text-sm">
                <span className="font-medium">{u.label}</span>
                <span className="text-xs text-ink-3">{fmtDate(u.scheduledFor, { weekday: "short", day: "numeric", month: "short" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
