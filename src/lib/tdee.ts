// ─────────────────────────────────────────────────────────────
// Dynamic TDEE engine
// Learns a user's true Total Daily Energy Expenditure from their own
// data (intake + trend weight) instead of a static formula, blended with
// a Katch-McArdle physiological prior. See design doc §04.
// In production this module is a Python/FastAPI service; here it runs in TS.
// ─────────────────────────────────────────────────────────────

const ACTIVITY_FACTOR: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export interface DailyPoint {
  date: Date;
  caloriesIn: number;
  weightKg?: number | null;
}

export interface TdeeInput {
  days: DailyPoint[]; // chronological ascending
  windowDays: number;
  sex?: string | null;
  age: number;
  heightCm?: number | null;
  activityBase: string;
  latestBodyFatPct?: number | null;
  latestWeightKg?: number | null;
}

export interface TdeeResult {
  tdee: number;
  ciLow: number;
  ciHigh: number;
  method: "ewma";
  observed: number | null;
  prior: number;
  weightObserved: number; // blend weight w in [0,1]
  weightSlopeKgPerWeek: number;
  rhoUsed: number;
  dataQuality: number;
  nDaysWithWeight: number;
  nDaysWithCalories: number;
  trendWeightKg: number | null;
}

/** Exponentially-weighted trend weight — filters day-to-day water/glycogen noise. */
export function ewmaSeries(
  points: { date: Date; weightKg: number }[],
  alpha = 0.1,
): { date: Date; trend: number }[] {
  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const out: { date: Date; trend: number }[] = [];
  let trend: number | null = null;
  for (const p of sorted) {
    trend = trend === null ? p.weightKg : alpha * p.weightKg + (1 - alpha) * trend;
    out.push({ date: p.date, trend });
  }
  return out;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function leanBodyMass(input: TdeeInput): number {
  const w = input.latestWeightKg ?? lastWeight(input.days) ?? 75;
  if (input.latestBodyFatPct != null) return w * (1 - input.latestBodyFatPct / 100);
  // Boer estimate fallback when body composition is unknown.
  const h = input.heightCm ?? 175;
  if (input.sex === "female") return 0.252 * w + 0.473 * h - 48.3;
  return 0.407 * w + 0.267 * h - 19.2;
}

function lastWeight(days: DailyPoint[]): number | null {
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].weightKg != null) return days[i].weightKg as number;
  }
  return null;
}

export function computeTdee(input: TdeeInput): TdeeResult {
  const { windowDays } = input;
  const cutoff = Date.now() - windowDays * 86_400_000;
  const win = input.days.filter((d) => d.date.getTime() >= cutoff);

  // ── Physiological prior (Katch-McArdle) ──
  const lbm = leanBodyMass(input);
  const bmr = 370 + 21.6 * lbm;
  const activity = ACTIVITY_FACTOR[input.activityBase] ?? 1.55;
  const prior = bmr * activity;

  // ── Observed TDEE via energy balance on trend weight ──
  const weightPts = win
    .filter((d) => d.weightKg != null)
    .map((d) => ({ date: d.date, weightKg: d.weightKg as number }));
  const calDays = win.filter((d) => d.caloriesIn > 0);
  const meanCalories =
    calDays.length > 0
      ? calDays.reduce((s, d) => s + d.caloriesIn, 0) / calDays.length
      : 0;

  const trend = ewmaSeries(weightPts);
  const trendWeightKg = trend.length ? trend[trend.length - 1].trend : null;

  // Fat fraction of the mass change drives energy density ρ (kcal/kg).
  const bf = input.latestBodyFatPct ?? 22;
  const fatFrac = clamp(0.6 + bf / 100, 0.6, 0.95);
  const rho = Math.round(fatFrac * 7700 + (1 - fatFrac) * 1800);

  let observed: number | null = null;
  let slopePerDay = 0;
  if (trend.length >= 2 && meanCalories > 0) {
    const start = trend[0];
    const end = trend[trend.length - 1];
    const spanDays = Math.max(
      1,
      (end.date.getTime() - start.date.getTime()) / 86_400_000,
    );
    const deltaKg = end.trend - start.trend;
    slopePerDay = deltaKg / spanDays;
    const storedPerDay = (rho * deltaKg) / spanDays; // <0 when losing
    observed = meanCalories - storedPerDay;
  }

  // ── Data-quality weighted Bayesian blend ──
  const adherence = windowDays > 0 ? calDays.length / windowDays : 0;
  const weightCoverage = clamp(weightPts.length / (windowDays / 3), 0, 1);
  const span =
    trend.length >= 2
      ? (trend[trend.length - 1].date.getTime() - trend[0].date.getTime()) /
        86_400_000
      : 0;
  const spanFactor = clamp(span / windowDays, 0, 1);
  const dataQuality = clamp(adherence * weightCoverage * spanFactor, 0, 1);
  const w = observed == null ? 0 : clamp(dataQuality, 0, 0.9);

  let tdee = w * (observed ?? prior) + (1 - w) * prior;
  // Guardrail: never drift more than ±40% from the physiological prior.
  tdee = clamp(tdee, prior * 0.7, prior * 1.4);

  const ciHalf = Math.round(120 + (1 - w) * 260);

  return {
    tdee: Math.round(tdee),
    ciLow: Math.round(tdee - ciHalf),
    ciHigh: Math.round(tdee + ciHalf),
    method: "ewma",
    observed: observed == null ? null : Math.round(observed),
    prior: Math.round(prior),
    weightObserved: Number(w.toFixed(2)),
    weightSlopeKgPerWeek: Number((slopePerDay * 7).toFixed(2)),
    rhoUsed: rho,
    dataQuality: Number(dataQuality.toFixed(2)),
    nDaysWithWeight: weightPts.length,
    nDaysWithCalories: calDays.length,
    trendWeightKg: trendWeightKg == null ? null : Number(trendWeightKg.toFixed(1)),
  };
}

export function mifflinStJeor(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex?: string | null;
  activityBase: string;
}): number {
  const s = input.sex === "female" ? -161 : 5;
  const bmr = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + s;
  return Math.round(bmr * (ACTIVITY_FACTOR[input.activityBase] ?? 1.55));
}
