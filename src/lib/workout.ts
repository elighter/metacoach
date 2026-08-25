// Template program generator + shared workout helpers.
// The AI path (workout-ai.ts) can override the exercise selection; when it is
// unavailable or fails, this deterministic template builds a coherent 3-day
// A/B session following the 4-phase periodized model.

import { LIBRARY_BY_SLUG, type Phase } from "./workout-library";

export type Goal = "cut" | "maintain" | "bulk";
export type DayType = "strength" | "functional";

export interface PlannedSet {
  slug: string;
  phase: Phase;
  orderIdx: number;
  targetSets: number;
  targetReps: string;
}

// Rotations give week-to-week variety without repeating the same session.
const STRENGTH_ROTATIONS: string[][] = [
  ["back-squat", "bench-press", "barbell-row", "romanian-deadlift", "overhead-press", "lat-pulldown"],
  ["leg-press", "incline-db-press", "seated-cable-row", "romanian-deadlift", "overhead-press", "walking-lunge"],
];
const FUNCTIONAL_ROTATIONS: string[][] = [
  ["kb-swing", "box-jump", "bulgarian-split-squat", "med-ball-slam", "farmer-carry", "pallof-press"],
  ["goblet-squat-jump", "battle-rope", "single-leg-rdl", "med-ball-slam", "farmer-carry", "pallof-press"],
];
const ACTIVATION_ROTATIONS: string[][] = [
  ["foam-roll-full", "hip-opener-dynamic", "incline-walk"],
  ["foam-roll-full", "leg-swings", "elliptical-warmup"],
  ["band-shoulder-dislocate", "hip-opener-dynamic", "incline-walk"],
];
const CARDIO_BY_DAY: Record<DayType, string[]> = {
  strength: ["treadmill-run", "rower"],
  functional: ["jump-rope", "stair-climber"],
};
const COOLDOWN = ["static-hamstring", "static-chest", "foam-roll-cooldown", "box-breathing"];

// Goal-driven strength prescription.
function strengthScheme(goal: Goal): { sets: number; reps: string } {
  if (goal === "bulk") return { sets: 4, reps: "6-10" };
  if (goal === "cut") return { sets: 3, reps: "10-12" };
  return { sets: 3, reps: "8-12" };
}

// Cardio duration (minutes) — cut leans on longer steady-state fat oxidation.
function cardioMinutes(goal: Goal): number {
  if (goal === "cut") return 20;
  if (goal === "bulk") return 10;
  return 15;
}

function specFor(slug: string, phase: Phase, goal: Goal): { targetSets: number; targetReps: string } {
  const unit = LIBRARY_BY_SLUG[slug]?.unit ?? "reps";
  switch (phase) {
    case "activation": {
      if (unit === "seconds") return { targetSets: 1, targetReps: "5 dk" };
      return { targetSets: 1, targetReps: unit === "reps" ? "10" : "45 sn" };
    }
    case "strength": {
      const s = strengthScheme(goal);
      return { targetSets: s.sets, targetReps: s.reps };
    }
    case "functional": {
      if (unit === "seconds") return { targetSets: 3, targetReps: "40 sn" };
      if (unit === "meters") return { targetSets: 3, targetReps: "30 m" };
      return { targetSets: 3, targetReps: "8-10" };
    }
    case "cardio":
      return { targetSets: 1, targetReps: `${cardioMinutes(goal)} dk` };
    case "cooldown":
      return { targetSets: 1, targetReps: slug === "box-breathing" ? "2 dk" : "45 sn" };
  }
}

/** Build the ordered set list for one session. `weekIndex` rotates variety. */
export function buildSessionPlan(dayType: DayType, weekIndex: number, goal: Goal): PlannedSet[] {
  const act = ACTIVATION_ROTATIONS[weekIndex % ACTIVATION_ROTATIONS.length];
  const main =
    dayType === "strength"
      ? STRENGTH_ROTATIONS[weekIndex % STRENGTH_ROTATIONS.length]
      : FUNCTIONAL_ROTATIONS[weekIndex % FUNCTIONAL_ROTATIONS.length];
  const cardio = [CARDIO_BY_DAY[dayType][weekIndex % CARDIO_BY_DAY[dayType].length]];
  const cooldown = COOLDOWN.slice(0, 3);

  const groups: [Phase, string[]][] = [
    ["activation", act],
    [dayType, main],
    ["cardio", cardio],
    ["cooldown", cooldown],
  ];

  const plan: PlannedSet[] = [];
  let order = 0;
  for (const [phase, slugs] of groups) {
    for (const slug of slugs) {
      if (!LIBRARY_BY_SLUG[slug]) continue;
      const spec = specFor(slug, phase, goal);
      plan.push({ slug, phase, orderIdx: order++, ...spec });
    }
  }
  return plan;
}

/** 3-day A/B/A → B/A/B alternation, mapped onto the next `weeks` of calendar. */
export function planWeeklyDays(daysPerWeek: number): DayType[] {
  // Simple ABA alternation across the week's training days.
  return Array.from({ length: daysPerWeek }, (_, i) => (i % 2 === 0 ? "strength" : "functional"));
}

export const DAY_LABEL: Record<DayType, string> = {
  strength: "A · Kuvvet",
  functional: "B · Fonksiyonel",
};

/**
 * Motivational kcal estimate for a completed session (NOT fed into TDEE).
 * kcal ≈ Σ MET · 3.5 · kg / 200 · minutes, with a rough per-phase minute budget.
 */
export function estimateSessionKcal(
  sets: { met: number; phase: string; targetSets: number }[],
  bodyKg: number,
): number {
  const minutesFor = (phase: string, targetSets: number) => {
    if (phase === "cardio") return 18;
    if (phase === "activation" || phase === "cooldown") return 3;
    return Math.max(2, targetSets) * 1.4; // strength/functional: ~1.4 min per set incl. rest
  };
  const kcal = sets.reduce((sum, s) => {
    const min = minutesFor(s.phase, s.targetSets);
    return sum + (s.met * 3.5 * bodyKg / 200) * min;
  }, 0);
  return Math.round(kcal);
}

/**
 * Adaptive protein nudge for a training day. Strength training raises protein
 * demand; on a cut we protect lean mass. Returns extra grams to add to the base
 * macro target and a short rationale.
 */
export function trainingDayProtein(goal: Goal, dayType: DayType, bodyKg: number): { extraG: number; note: string } {
  const base = dayType === "strength" ? 0.35 : 0.25; // g/kg bump on top of baseline
  const goalMult = goal === "cut" ? 1.2 : goal === "bulk" ? 1.0 : 1.1;
  const extraG = Math.round(base * goalMult * bodyKg);
  const why =
    goal === "cut"
      ? "Kesimde yağ yakarken kas kütlesini korumak için"
      : goal === "bulk"
        ? "Kas gelişimini desteklemek için"
        : "Toparlanmayı hızlandırmak için";
  return { extraG, note: `${why} bugün +${extraG}g protein hedefleniyor.` };
}
