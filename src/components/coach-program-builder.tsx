"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Plus, Trash2, ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { EXERCISE_LIBRARY, PHASE_LABEL, type Phase } from "@/lib/workout-library";

export interface BuiltExercise {
  slug: string;
  targetSets: number;
  targetReps: string;
}
export interface BuiltSession {
  date: string;
  label: string;
  dayType: string;
  exercises: BuiltExercise[];
}

interface ExRow {
  slug: string;
  targetSets: number;
  targetReps: string;
}
interface DayState {
  label: string;
  dayType: string;
  exercises: ExRow[];
}

const PHASE_ORDER: Phase[] = ["activation", "strength", "functional", "cardio", "cooldown"];
const DAY_TYPES: [string, string][] = [
  ["strength", "Kuvvet"],
  ["functional", "Fonksiyonel"],
  ["cardio", "Kardiyo"],
];
const DAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const DAY_LONG = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

function mondayOf(base: Date): Date {
  const x = new Date(base);
  const dow = (x.getDay() + 6) % 7; // Pzt=0
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyWeek(): DayState[] {
  return DAY_LONG.map((label) => ({ label, dayType: "strength", exercises: [] }));
}

export function CoachProgramBuilder({
  clientId,
  onPreview,
}: {
  clientId: string;
  onPreview?: (sessions: BuiltSession[]) => void; // verilirse: kaydetmez, canlı önizleme yayar
}) {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [days, setDays] = useState<DayState[]>(emptyWeek);
  const [sel, setSel] = useState(() => (new Date().getDay() + 6) % 7);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const day = days[sel];
  const totalExercises = days.reduce((s, d) => s + d.exercises.length, 0);

  // Kurulmuş seansları hesapla (submit ve canlı önizleme aynı biçimi kullanır).
  const built: BuiltSession[] = useMemo(
    () =>
      days
        .map((d, i) => ({ d, date: ymd(addDays(weekStart, i)) }))
        .filter(({ d }) => d.exercises.length > 0)
        .map(({ d, date }) => ({ date, label: d.label, dayType: d.dayType, exercises: d.exercises })),
    [days, weekStart],
  );
  useEffect(() => {
    if (onPreview) onPreview(built);
  }, [built, onPreview]);

  function update(patch: Partial<DayState>) {
    setDays((ds) => ds.map((d, i) => (i === sel ? { ...d, ...patch } : d)));
    setState("idle");
  }
  function addExercise() {
    update({ exercises: [...day.exercises, { slug: EXERCISE_LIBRARY[0].slug, targetSets: 3, targetReps: "10" }] });
  }
  function updateExercise(ei: number, patch: Partial<ExRow>) {
    update({ exercises: day.exercises.map((e, i) => (i === ei ? { ...e, ...patch } : e)) });
  }
  function removeExercise(ei: number) {
    update({ exercises: day.exercises.filter((_, i) => i !== ei) });
  }
  function shiftWeek(n: number) {
    setWeekStart((w) => addDays(w, n * 7));
    setState("idle");
  }

  async function submit() {
    if (built.length === 0) {
      setError("En az bir güne hareket ekle.");
      return;
    }
    setError(null);
    setState("saving");
    const res = await fetch("/api/coach/program", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, sessions: built }),
    });
    if (res.ok) {
      setState("saved");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Program gönderilemedi.");
      setState("idle");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Hafta gezgini */}
      <div className="flex items-center justify-between">
        <button className="btn h-9 px-2" onClick={() => shiftWeek(-1)} aria-label="Önceki hafta"><ChevronLeft className="h-4 w-4" /></button>
        <div className="text-sm font-semibold">
          {weekStart.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} – {weekEnd.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
        </div>
        <button className="btn h-9 px-2" onClick={() => shiftWeek(1)} aria-label="Sonraki hafta"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {/* Gün şeridi (takvim) */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const date = addDays(weekStart, i);
          const active = i === sel;
          const has = d.exercises.length > 0;
          return (
            <button
              key={i}
              onClick={() => { setSel(i); setState("idle"); }}
              className={[
                "flex flex-col items-center rounded-lg border px-1 py-2 transition-colors",
                active ? "border-primary bg-primary-wash text-primary-ink" : "border-border bg-surface-2 text-ink-2 hover:text-ink",
              ].join(" ")}
            >
              <span className="text-[0.65rem] font-semibold uppercase">{DAY_SHORT[i]}</span>
              <span className="text-sm font-bold tabular-nums">{date.getDate()}</span>
              <span className={["mt-1 h-1.5 w-1.5 rounded-full", has ? "bg-primary" : "bg-transparent"].join(" ")} />
            </button>
          );
        })}
      </div>

      {/* Seçili günün editörü */}
      <div className="rounded-xl border border-border bg-surface-2 p-3">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <label className="block flex-1">
            <span className="label">{DAY_LONG[sel]} · gün adı</span>
            <input className="input" value={day.label} onChange={(e) => update({ label: e.target.value })} placeholder="Örn: Üst vücut" />
          </label>
          <label className="block">
            <span className="label">Tür</span>
            <select className="input" value={day.dayType} onChange={(e) => update({ dayType: e.target.value })}>
              {DAY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>

        {day.exercises.length === 0 && (
          <p className="mb-2 text-sm text-ink-3">Bu gün için henüz hareket yok — dinlenme günü ya da aşağıdan ekle.</p>
        )}
        <div className="space-y-1.5">
          {day.exercises.map((ex, ei) => (
            <div key={ei} className="flex items-center gap-2">
              <select className="input flex-1" value={ex.slug} onChange={(e) => updateExercise(ei, { slug: e.target.value })}>
                {PHASE_ORDER.map((ph) => (
                  <optgroup key={ph} label={PHASE_LABEL[ph]}>
                    {EXERCISE_LIBRARY.filter((x) => x.phase === ph).map((x) => (
                      <option key={x.slug} value={x.slug}>{x.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input type="number" min={1} max={12} className="input w-16 text-center" value={ex.targetSets} onChange={(e) => updateExercise(ei, { targetSets: Math.max(1, Number(e.target.value)) })} title="Set" />
              <input className="input w-20 text-center" value={ex.targetReps} onChange={(e) => updateExercise(ei, { targetReps: e.target.value })} title="Tekrar" placeholder="10" />
              <button className="btn h-9 px-2 text-ink-3" onClick={() => removeExercise(ei)} aria-label="Kaldır"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button className="btn mt-1 text-sm" onClick={addExercise}><Plus className="h-4 w-4" /> Hareket ekle</button>
        </div>
      </div>

      {!onPreview && (
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" onClick={submit} disabled={state === "saving" || totalExercises === 0}>
            {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "saved" ? <Check className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
            {state === "saved" ? "Gönderildi" : `Programı gönder (${totalExercises} hareket)`}
          </button>
          {error && <span className="text-sm text-crit">{error}</span>}
        </div>
      )}
      {!onPreview && (
        <p className="text-xs text-ink-3">Günlere hareket ekle (boş günler dinlenme sayılır). Kalori otomatik hesaplanır; program danışanın Antrenman ekranına düşer, tamamladığında onaylar/atlar.</p>
      )}
    </div>
  );
}
