// Program generation service: turns a plan (AI or template) into a persisted
// WorkoutProgram + upcoming WorkoutSessions with their WorkoutSets.

import { prisma } from "./db";
import { startOfDay, ageFromDob } from "./utils";
import {
  buildSessionPlan,
  planWeeklyDays,
  DAY_LABEL,
  type DayType,
  type Goal,
  type PlannedSet,
} from "./workout";
import { LIBRARY_BY_SLUG, type Phase } from "./workout-library";
import { aiConfigured, generateProgramWithClaude, type AthleteProfile } from "./workout-ai";

interface DayPlan {
  dayType: DayType;
  sets: PlannedSet[];
}

interface GenerateResult {
  programId: string;
  source: "ai" | "template";
  todaySessionId: string | null;
  name: string;
  notes: string | null;
}

/** A day is usable only if it has real main work plus enough total volume. */
function dayValid(sets: PlannedSet[]): boolean {
  const main = sets.filter((s) => s.phase === "strength" || s.phase === "functional").length;
  return main >= 3 && sets.length >= 5;
}

async function buildAthleteProfile(
  user: { id: string; goal: string; sex: string | null; dob: Date | null; heightCm: number | null; activityBase: string },
  daysPerWeek: number,
): Promise<AthleteProfile> {
  const [bio, lab] = await Promise.all([
    prisma.biometric.findFirst({ where: { userId: user.id }, orderBy: { measuredAt: "desc" } }),
    prisma.labResult.findFirst({
      where: { userId: user.id, confirmedAt: { not: null } },
      orderBy: { confirmedAt: "desc" },
      include: { biomarkers: { where: { flag: { not: "normal" } } } },
    }),
  ]);
  const labFlags = lab?.biomarkers.map((b) => `${b.name} ${b.flag === "high" ? "yüksek" : "düşük"}`) ?? [];
  return {
    goal: user.goal as Goal,
    daysPerWeek,
    sex: user.sex,
    age: ageFromDob(user.dob),
    heightCm: user.heightCm,
    weightKg: bio?.weightKg ?? null,
    bodyFatPct: bio?.bodyFatPct ?? null,
    activityBase: user.activityBase,
    labFlags,
  };
}

function templateDays(goal: Goal, daysPerWeek: number): DayPlan[] {
  return planWeeklyDays(daysPerWeek).map((dayType, i) => ({
    dayType,
    sets: buildSessionPlan(dayType, i, goal),
  }));
}

/**
 * Regenerate the user's active program. Tries Claude when configured, validates
 * every slug against the DB library, and falls back to the deterministic
 * template on any failure so generation never leaves the user without a plan.
 */
export async function regenerateProgram(
  userId: string,
  opts?: { daysPerWeek?: number },
): Promise<GenerateResult> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const daysPerWeek = opts?.daysPerWeek ?? 3;
  const goal = user.goal as Goal;

  const exercises = await prisma.exercise.findMany();
  const bySlug = new Map(exercises.map((e) => [e.slug, e]));

  let days: DayPlan[] = [];
  let source: "ai" | "template" = "template";
  let name = goal === "cut" ? "Kesim — 3 Gün A/B" : goal === "bulk" ? "Kütle — 3 Gün A/B" : "Koruma — 3 Gün A/B";
  let notes: string | null = "Full-body A/B dönüşümlü, 4 fazlı periyodizasyon.";

  if (aiConfigured()) {
    try {
      const profile = await buildAthleteProfile(user, daysPerWeek);
      const ai = await generateProgramWithClaude(profile);
      const mapped: DayPlan[] = ai.days.slice(0, daysPerWeek).map((d) => ({
        dayType: d.dayType,
        sets: d.sets
          .filter((s) => bySlug.has(s.slug))
          .map((s, idx) => ({
            slug: s.slug,
            phase: (LIBRARY_BY_SLUG[s.slug]?.phase ?? s.phase) as Phase,
            orderIdx: idx,
            targetSets: Math.max(1, Math.round(s.targetSets)),
            targetReps: String(s.targetReps).slice(0, 24),
          })),
      }));
      if (mapped.length === daysPerWeek && mapped.every((d) => dayValid(d.sets))) {
        days = mapped;
        source = "ai";
        name = ai.name?.slice(0, 60) || name;
        notes = ai.notes?.slice(0, 400) || notes;
      }
    } catch (err) {
      console.error("[workout] AI generation failed, using template:", err);
    }
  }

  if (days.length === 0) days = templateDays(goal, daysPerWeek);

  // Retire previous active program(s) and clear their still-pending sessions.
  const oldActive = await prisma.workoutProgram.findMany({ where: { userId, active: true } });
  if (oldActive.length) {
    const ids = oldActive.map((p) => p.id);
    await prisma.workoutSession.deleteMany({
      where: { programId: { in: ids }, status: { in: ["planned", "in_progress"] } },
    });
    await prisma.workoutProgram.updateMany({ where: { id: { in: ids } }, data: { active: false } });
  }

  const program = await prisma.workoutProgram.create({
    data: { userId, name, goal, daysPerWeek, source, notes, active: true },
  });

  // Schedule the first session today, then every other day.
  const today = startOfDay(new Date());
  let todaySessionId: string | null = null;
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const scheduledFor = new Date(today.getTime() + i * 2 * 86_400_000);
    const session = await prisma.workoutSession.create({
      data: {
        userId,
        programId: program.id,
        scheduledFor,
        dayType: day.dayType,
        label: DAY_LABEL[day.dayType],
        status: "planned",
        sets: {
          create: day.sets.map((s) => ({
            exerciseId: bySlug.get(s.slug)!.id,
            phase: s.phase,
            orderIdx: s.orderIdx,
            targetSets: s.targetSets,
            targetReps: s.targetReps,
          })),
        },
      },
    });
    if (i === 0) todaySessionId = session.id;
  }

  return { programId: program.id, source, todaySessionId, name, notes };
}
