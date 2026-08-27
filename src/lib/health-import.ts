// Wearable aktivite içe alma adaptörü.
// Apple Watch + Technogym verisi Apple Health'te toplanır; iOS tarafı
// ("Health Auto Export" uygulaması veya Apple Kısayol) günlük-agregeli JSON'u
// webhook'a POST eder. Tam Apple export.xml (yüzlerce MB) tekrarlayan yol
// DEĞİLDİR — burada yalnızca agregeli JSON normalize edilir.
//
// İki biçim desteklenir:
//  1) Health Auto Export: { data: { metrics: [{name, units, data:[{date, qty}]}],
//                                    workouts: [{name, start, end, duration, ...}] } }
//  2) Generic/Kısayol:    { days: [{date, activeKcal, steps}], workouts: [...] }

import { prisma } from "@/lib/db";
import { startOfDay } from "@/lib/utils";

export interface NormalizedDay {
  date: string; // YYYY-MM-DD (yerel gün)
  activeKcal?: number;
  basalKcal?: number;
  steps?: number;
}
export interface NormalizedWorkout {
  type: string; // ham Apple/HAE tipi ya da serbest metin
  label: string; // Türkçe görünen ad
  dayType: string; // strength | functional | cardio
  start: string; // ISO
  durationMin: number;
  kcal?: number;
  distanceKm?: number;
}
export interface NormalizedHealth {
  days: NormalizedDay[];
  workouts: NormalizedWorkout[];
  source: "health_auto_export" | "generic";
}

// ── Yardımcılar ────────────────────────────────────────────────────────────

/** "2026-08-22 00:00:00 +0300" / ISO / Date → YYYY-MM-DD (gün anahtarı). */
function toDayKey(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function toIso(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  // Health Auto Export tarih biçimi ("... +0300") Date tarafından anlaşılır.
  const d = new Date(v.replace(/ ([+-]\d{4})$/, "$1"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

// HAE enerjiyi genelde kJ (kilojoule) gönderir; sistemimiz kcal ile çalışır.
const KJ_PER_KCAL = 4.184;
function toKcal(qty: number | undefined, units: unknown): number | undefined {
  if (qty === undefined) return undefined;
  const u = String(units ?? "").toLowerCase();
  if (u === "kj" || u === "kilojoules" || u === "kjoule" || u === "kilojoule") return qty / KJ_PER_KCAL;
  return qty; // kcal / Cal / cal / bilinmeyen → kcal varsay
}

/** {qty,units} ya da düz sayı olabilen enerji alanından kcal çıkar. */
function energyKcal(field: unknown): number | undefined {
  if (field && typeof field === "object") {
    const o = field as Record<string, unknown>;
    return toKcal(num(o.qty), o.units);
  }
  return num(field);
}

/**
 * Workout tipini dayType'a eşle (TR + EN anahtar kelimeler). Etiket olarak
 * cihazın verdiği özgün ad kullanılır (ör. "Açık Hava Yürüyüş").
 */
function mapWorkoutDayType(raw: string): string {
  const t = raw.toLowerCase();
  if (/(kuvvet|ağırlık|strength|weight)/.test(t)) return "strength";
  if (/(yürü|koş|kardiyo|bisiklet|eliptik|yüz|merdiven|koşu band|walk|run|hik|cycl|bik|row|elliptical|stair|cardio|swim)/.test(t))
    return "cardio";
  if (/(hiit|interval|core|pilates|yoga|esneme|mobilite|mobility|fonksiyonel|functional)/.test(t))
    return "functional";
  return "functional";
}

// ── Normalizasyon (saf) ─────────────────────────────────────────────────────

type DayField = "activeKcal" | "basalKcal" | "steps";
const ENERGY_FIELDS: DayField[] = ["activeKcal", "basalKcal"];
const METRIC_ALIASES: Record<string, DayField> = {
  active_energy: "activeKcal",
  active_energy_burned: "activeKcal",
  activeenergyburned: "activeKcal",
  basal_energy_burned: "basalKcal",
  basal_energy: "basalKcal",
  resting_energy: "basalKcal",
  step_count: "steps",
  steps: "steps",
};

function normalizeHealthAutoExport(data: Record<string, unknown>): NormalizedHealth {
  const dayMap = new Map<string, NormalizedDay>();
  const put = (dateKey: string, field: DayField, qty: number) => {
    const d = dayMap.get(dateKey) ?? { date: dateKey };
    d[field] = (d[field] ?? 0) + qty; // aynı gün birden çok örnek → topla
    dayMap.set(dateKey, d);
  };

  const metrics = Array.isArray(data.metrics) ? data.metrics : [];
  for (const metric of metrics as Record<string, unknown>[]) {
    const name = String(metric?.name ?? "").toLowerCase();
    const field = METRIC_ALIASES[name];
    if (!field) continue;
    const units = metric.units; // ör. active/basal_energy → "kJ"
    const points = Array.isArray(metric.data) ? metric.data : [];
    for (const p of points as Record<string, unknown>[]) {
      const key = toDayKey(p?.date);
      let qty = num(p?.qty ?? p?.value);
      if (ENERGY_FIELDS.includes(field)) qty = toKcal(qty, units); // kJ → kcal
      if (key && qty !== undefined) put(key, field, qty);
    }
  }

  const workouts: NormalizedWorkout[] = [];
  const rawWorkouts = Array.isArray(data.workouts) ? data.workouts : [];
  for (const w of rawWorkouts as Record<string, unknown>[]) {
    const start = toIso(w?.start ?? w?.startDate);
    if (!start) continue;
    const rawType = String(w?.name ?? w?.workoutActivityType ?? "Antrenman");
    const dayType = mapWorkoutDayType(rawType);
    const end = toIso(w?.end ?? w?.endDate);
    // HAE duration = saniye (düz sayı). En güvenilir kaynak start–end farkı.
    const durationMin = end
      ? (new Date(end).getTime() - new Date(start).getTime()) / 60000
      : typeof w?.duration === "number"
        ? (w.duration as number) / 60
        : num((w?.duration as Record<string, unknown>)?.qty) ?? 0;
    // Aktif enerji (bazal hariç) tercih; yoksa toplam. kJ→kcal çevrilir.
    const kcal =
      energyKcal(w?.activeEnergyBurned) ??
      energyKcal(w?.activeEnergy) ??
      energyKcal(w?.totalEnergy) ??
      energyKcal(w?.totalEnergyBurned);
    const dist = w?.distance as Record<string, unknown> | null | undefined;
    const distKm = num(dist?.qty ?? w?.totalDistance);
    workouts.push({
      type: rawType,
      label: rawType, // cihazın verdiği özgün ad
      dayType,
      start,
      durationMin: Math.max(0, Math.round(durationMin)),
      kcal: kcal !== undefined ? Math.round(kcal) : undefined,
      distanceKm: distKm !== undefined ? Number(distKm.toFixed(2)) : undefined,
    });
  }

  return { days: [...dayMap.values()], workouts, source: "health_auto_export" };
}

function normalizeGeneric(payload: Record<string, unknown>): NormalizedHealth {
  const days: NormalizedDay[] = [];
  const rawDays = Array.isArray(payload.days) ? payload.days : [];
  for (const d of rawDays as Record<string, unknown>[]) {
    const key = toDayKey(d?.date);
    if (!key) continue;
    days.push({
      date: key,
      activeKcal: num(d?.activeKcal ?? d?.active_energy),
      steps: num(d?.steps ?? d?.step_count),
    });
  }

  const workouts: NormalizedWorkout[] = [];
  const rawWorkouts = Array.isArray(payload.workouts) ? payload.workouts : [];
  for (const w of rawWorkouts as Record<string, unknown>[]) {
    const start = toIso(w?.start);
    if (!start) continue;
    const rawType = String(w?.type ?? "Antrenman");
    workouts.push({
      type: rawType,
      label: rawType,
      dayType: mapWorkoutDayType(rawType),
      start,
      durationMin: Math.max(0, Math.round(num(w?.durationMin) ?? 0)),
      kcal: num(w?.kcal) !== undefined ? Math.round(num(w?.kcal)!) : undefined,
      distanceKm: num(w?.distanceKm),
    });
  }

  return { days, workouts, source: "generic" };
}

export function normalizeHealthPayload(payload: unknown): NormalizedHealth {
  if (!payload || typeof payload !== "object") {
    return { days: [], workouts: [], source: "generic" };
  }
  const p = payload as Record<string, unknown>;
  const data = p.data as Record<string, unknown> | undefined;
  if (data && (Array.isArray(data.metrics) || Array.isArray(data.workouts))) {
    return normalizeHealthAutoExport(data);
  }
  return normalizeGeneric(p);
}

// ── DB'ye yazım ─────────────────────────────────────────────────────────────

export interface ImportResult {
  daysWritten: number;
  workoutsCreated: number;
  sessionsCompleted: number;
}

/**
 * Normalize edilmiş aktiviteyi DB'ye yazar:
 *  - DailyLog.activeKcal/steps upsert (yalnızca gelen alanlar güncellenir)
 *  - Antrenman o güne planlı bir seansla eşleşiyorsa onu "completed" işaretle;
 *    yoksa source="imported" yeni bir seans oluştur (start dakikasına göre tekilleştir)
 *  - Apple Health cihaz bağlantısını "connected" + lastSyncAt olarak günceller
 */
export async function applyHealthImport(
  userId: string,
  n: NormalizedHealth,
): Promise<ImportResult> {
  let daysWritten = 0;
  for (const d of n.days) {
    if (d.activeKcal === undefined && d.basalKcal === undefined && d.steps === undefined) continue;
    const day = startOfDay(new Date(`${d.date}T00:00:00`));
    const patch: { activeKcal?: number; basalKcal?: number; steps?: number } = {};
    if (d.activeKcal !== undefined) patch.activeKcal = Math.round(d.activeKcal);
    if (d.basalKcal !== undefined) patch.basalKcal = Math.round(d.basalKcal);
    if (d.steps !== undefined) patch.steps = Math.round(d.steps);
    await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date: day } },
      create: { userId, date: day, ...patch },
      update: patch,
    });
    daysWritten++;
  }

  let workoutsCreated = 0;
  let sessionsCompleted = 0;
  for (const w of n.workouts) {
    const start = new Date(w.start);
    const day = startOfDay(start);
    const dayEnd = new Date(day.getTime() + 86_400_000);

    // Aynı güne planlı, henüz tamamlanmamış bir seans varsa onu tamamla.
    const planned = await prisma.workoutSession.findFirst({
      where: {
        userId,
        scheduledFor: { gte: day, lt: dayEnd },
        status: { not: "completed" },
        source: { not: "imported" },
      },
      orderBy: { scheduledFor: "asc" },
    });
    if (planned) {
      await prisma.workoutSession.update({
        where: { id: planned.id },
        data: {
          status: "completed",
          completedAt: start,
          durationMin: w.durationMin || planned.durationMin,
          estKcal: w.kcal ?? planned.estKcal,
        },
      });
      sessionsCompleted++;
      continue;
    }

    // Aksi halde: aynı start dakikasında zaten import edilmiş mi? (tekilleştirme)
    const minute = new Date(Math.floor(start.getTime() / 60000) * 60000);
    const minuteEnd = new Date(minute.getTime() + 60000);
    const dup = await prisma.workoutSession.findFirst({
      where: {
        userId,
        source: "imported",
        scheduledFor: { gte: minute, lt: minuteEnd },
        label: w.label,
      },
    });
    if (dup) continue;

    await prisma.workoutSession.create({
      data: {
        userId,
        scheduledFor: start,
        dayType: w.dayType,
        label: w.label,
        status: "completed",
        completedAt: start,
        durationMin: w.durationMin || null,
        estKcal: w.kcal ?? null,
        source: "imported",
      },
    });
    workoutsCreated++;
  }

  // Apple Health cihaz bağlantısını canlı tut.
  const existing = await prisma.deviceConnection.findFirst({
    where: { userId, provider: "apple_health" },
  });
  if (existing) {
    await prisma.deviceConnection.update({
      where: { id: existing.id },
      data: { status: "connected", lastSyncAt: new Date() },
    });
  } else {
    await prisma.deviceConnection.create({
      data: { userId, provider: "apple_health", status: "connected", lastSyncAt: new Date() },
    });
  }

  return { daysWritten, workoutsCreated, sessionsCompleted };
}
