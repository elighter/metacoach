"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Plus, Trash2, CalendarPlus, Dumbbell } from "lucide-react";
import { EXERCISE_LIBRARY, PHASE_LABEL, type Phase } from "@/lib/workout-library";

interface ExRow {
  slug: string;
  targetSets: number;
  targetReps: string;
}
interface DayBlock {
  date: string; // yyyy-mm-dd
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

function todayStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function newBlock(offset: number): DayBlock {
  return { date: todayStr(offset), label: "Gün", dayType: "strength", exercises: [] };
}

export function CoachProgramBuilder({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<DayBlock[]>([newBlock(0)]);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  function update(bi: number, patch: Partial<DayBlock>) {
    setBlocks((b) => b.map((blk, i) => (i === bi ? { ...blk, ...patch } : blk)));
    setState("idle");
  }
  function addExercise(bi: number) {
    update(bi, { exercises: [...blocks[bi].exercises, { slug: EXERCISE_LIBRARY[0].slug, targetSets: 3, targetReps: "10" }] });
  }
  function updateExercise(bi: number, ei: number, patch: Partial<ExRow>) {
    const next = blocks[bi].exercises.map((e, i) => (i === ei ? { ...e, ...patch } : e));
    update(bi, { exercises: next });
  }
  function removeExercise(bi: number, ei: number) {
    update(bi, { exercises: blocks[bi].exercises.filter((_, i) => i !== ei) });
  }

  async function submit() {
    const sessions = blocks
      .filter((b) => b.exercises.length > 0)
      .map((b) => ({ date: b.date, label: b.label, dayType: b.dayType, exercises: b.exercises }));
    if (sessions.length === 0) {
      setError("En az bir güne hareket ekle.");
      return;
    }
    setError(null);
    setState("saving");
    const res = await fetch("/api/coach/program", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, sessions }),
    });
    if (res.ok) {
      setState("saved");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Program gönderilemedi.");
      setState("idle");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((blk, bi) => (
        <div key={bi} className="rounded-xl border border-border bg-surface-2 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="label">Tarih</span>
              <input type="date" className="input" value={blk.date} onChange={(e) => update(bi, { date: e.target.value })} />
            </label>
            <label className="block flex-1">
              <span className="label">Gün adı</span>
              <input className="input" value={blk.label} onChange={(e) => update(bi, { label: e.target.value })} placeholder="Örn: Pzt · Üst vücut" />
            </label>
            <label className="block">
              <span className="label">Tür</span>
              <select className="input" value={blk.dayType} onChange={(e) => update(bi, { dayType: e.target.value })}>
                {DAY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            {blocks.length > 1 && (
              <button className="btn h-9 px-2 text-crit" onClick={() => setBlocks((b) => b.filter((_, i) => i !== bi))} aria-label="Günü sil">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-3 space-y-1.5">
            {blk.exercises.map((ex, ei) => (
              <div key={ei} className="flex items-center gap-2">
                <select
                  className="input flex-1"
                  value={ex.slug}
                  onChange={(e) => updateExercise(bi, ei, { slug: e.target.value })}
                >
                  {PHASE_ORDER.map((ph) => (
                    <optgroup key={ph} label={PHASE_LABEL[ph]}>
                      {EXERCISE_LIBRARY.filter((x) => x.phase === ph).map((x) => (
                        <option key={x.slug} value={x.slug}>{x.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input
                  type="number" min={1} max={12}
                  className="input w-16 text-center"
                  value={ex.targetSets}
                  onChange={(e) => updateExercise(bi, ei, { targetSets: Math.max(1, Number(e.target.value)) })}
                  title="Set"
                />
                <input
                  className="input w-20 text-center"
                  value={ex.targetReps}
                  onChange={(e) => updateExercise(bi, ei, { targetReps: e.target.value })}
                  title="Tekrar"
                  placeholder="10"
                />
                <button className="btn h-9 px-2 text-ink-3" onClick={() => removeExercise(bi, ei)} aria-label="Kaldır">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button className="btn mt-1 text-sm" onClick={() => addExercise(bi)}>
              <Plus className="h-4 w-4" /> Hareket ekle
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" onClick={() => setBlocks((b) => [...b, newBlock(b.length)])}>
          <CalendarPlus className="h-4 w-4" /> Gün ekle
        </button>
        <button className="btn btn-primary" onClick={submit} disabled={state === "saving"}>
          {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "saved" ? <Check className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
          {state === "saved" ? "Gönderildi" : "Programı danışana gönder"}
        </button>
        {error && <span className="text-sm text-crit">{error}</span>}
      </div>
      <p className="text-xs text-ink-3">Kalori, hareket + set + danışanın ağırlığından otomatik hesaplanır. Program danışanın Antrenman ekranına düşer; tamamladığında onaylar, olmadıysa atlar.</p>
    </div>
  );
}
