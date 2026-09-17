// Coach 3-day program templates.
// Used by the quick-log flow and the admin seed endpoint.

export interface CoachTemplate {
  key: string;
  label: string;
  dayType: string;
  phase: string; // primary phase for exercises
  exercises: { slug: string; targetSets: number; targetReps: string }[];
}

export const COACH_TEMPLATES: CoachTemplate[] = [
  {
    key: "mobility",
    label: "Denge · Mobilizasyon · Stabilizasyon",
    dayType: "activation",
    phase: "activation",
    exercises: [
      { slug: "roll-up-ball", targetSets: 2, targetReps: "10" },
      { slug: "banded-single-leg-circle", targetSets: 2, targetReps: "10" },
      { slug: "dead-bug-ball", targetSets: 2, targetReps: "10" },
      { slug: "seated-single-leg-lift", targetSets: 2, targetReps: "10" },
      { slug: "quadruped-knee-ext", targetSets: 2, targetReps: "10" },
      { slug: "quadruped-hip-ext", targetSets: 2, targetReps: "10" },
      { slug: "marching-bridge", targetSets: 2, targetReps: "10" },
      { slug: "bird-dog", targetSets: 2, targetReps: "10" },
      { slug: "overhead-ball-knee-drive", targetSets: 2, targetReps: "10" },
    ],
  },
  {
    key: "functional",
    label: "Fonksiyonel Kardiyo",
    dayType: "functional",
    phase: "functional",
    exercises: [
      { slug: "squat-shoulder-press", targetSets: 3, targetReps: "10" },
      { slug: "burpee", targetSets: 3, targetReps: "10" },
      { slug: "dips", targetSets: 3, targetReps: "8-10" },
      { slug: "push-up", targetSets: 3, targetReps: "10-12" },
      { slug: "pull-up", targetSets: 3, targetReps: "6-8" },
      { slug: "sit-up", targetSets: 3, targetReps: "15" },
      { slug: "lunge-lateral-raise", targetSets: 3, targetReps: "10" },
      { slug: "step-up-knee-ohp", targetSets: 3, targetReps: "8-10" },
      { slug: "jump-squat", targetSets: 3, targetReps: "10" },
      { slug: "kb-swing", targetSets: 3, targetReps: "15" },
    ],
  },
  {
    key: "strength",
    label: "Kuvvet · Üst Vücut",
    dayType: "strength",
    phase: "strength",
    exercises: [
      { slug: "lat-pulldown", targetSets: 3, targetReps: "10-12" },
      { slug: "upper-back-row", targetSets: 3, targetReps: "10-12" },
      { slug: "bench-press", targetSets: 4, targetReps: "8-10" },
      { slug: "leg-press", targetSets: 4, targetReps: "10-12" },
      { slug: "back-extension", targetSets: 3, targetReps: "12-15" },
      { slug: "overhead-press", targetSets: 3, targetReps: "8-10" },
      { slug: "rear-delt-fly", targetSets: 3, targetReps: "12-15" },
      { slug: "chest-fly", targetSets: 3, targetReps: "12" },
      { slug: "lateral-raise", targetSets: 3, targetReps: "12-15" },
      { slug: "preacher-curl", targetSets: 3, targetReps: "10-12" },
      { slug: "triceps-pushdown", targetSets: 3, targetReps: "10-12" },
    ],
  },
];

export const COACH_TEMPLATE_BY_KEY = Object.fromEntries(
  COACH_TEMPLATES.map((t) => [t.key, t]),
);
