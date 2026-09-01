import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const EXERCISES = [
  { slug: "roll-up-ball", name: "Roll Up with Ball", phase: "activation", muscleGroup: "core", equipment: "bodyweight", met: 3.5, unit: "reps" },
  { slug: "banded-single-leg-circle", name: "Banded Single Leg Circle", phase: "activation", muscleGroup: "mobility", equipment: "band", met: 3.5, unit: "reps" },
  { slug: "dead-bug-ball", name: "Dead Bug with Ball + Alternating Leg Extension", phase: "activation", muscleGroup: "core", equipment: "bodyweight", met: 3.5, unit: "reps" },
  { slug: "seated-single-leg-lift", name: "Seated Alternating Single Leg Lift", phase: "activation", muscleGroup: "core", equipment: "bodyweight", met: 3, unit: "reps" },
  { slug: "quadruped-knee-ext", name: "Quadruped Resisted Knee Extension", phase: "activation", muscleGroup: "core", equipment: "band", met: 3.5, unit: "reps" },
  { slug: "quadruped-hip-ext", name: "Quadruped Resisted Hip Extension", phase: "activation", muscleGroup: "core", equipment: "band", met: 3.5, unit: "reps" },
  { slug: "marching-bridge", name: "Marching Bridge", phase: "activation", muscleGroup: "core", equipment: "bodyweight", met: 4, unit: "reps" },
  { slug: "bird-dog", name: "Bird Dog", phase: "activation", muscleGroup: "core", equipment: "bodyweight", met: 3.5, unit: "reps" },
  { slug: "overhead-ball-knee-drive", name: "Overhead Ball Knee Drive", phase: "activation", muscleGroup: "core", equipment: "bodyweight", met: 4, unit: "reps" },
  { slug: "upper-back-row", name: "Upper Back Row", phase: "strength", muscleGroup: "pull", equipment: "machine", met: 5, unit: "reps" },
  { slug: "back-extension", name: "Back Extension", phase: "strength", muscleGroup: "pull", equipment: "bodyweight", met: 4.5, unit: "reps" },
  { slug: "rear-delt-fly", name: "Rear Delt Fly", phase: "strength", muscleGroup: "pull", equipment: "dumbbell", met: 4, unit: "reps" },
  { slug: "chest-fly", name: "Chest Fly", phase: "strength", muscleGroup: "push", equipment: "dumbbell", met: 4.5, unit: "reps" },
  { slug: "lateral-raise", name: "Lateral Raise", phase: "strength", muscleGroup: "push", equipment: "dumbbell", met: 4, unit: "reps" },
  { slug: "preacher-curl", name: "Preacher Curl", phase: "strength", muscleGroup: "pull", equipment: "dumbbell", met: 4, unit: "reps" },
  { slug: "triceps-pushdown", name: "Triceps Pushdown", phase: "strength", muscleGroup: "push", equipment: "cable", met: 4, unit: "reps" },
  { slug: "squat-shoulder-press", name: "Squat + Shoulder Press", phase: "functional", muscleGroup: "full", equipment: "dumbbell", met: 6.5, unit: "reps" },
  { slug: "burpee", name: "Burpee", phase: "functional", muscleGroup: "full", equipment: "bodyweight", met: 8, unit: "reps" },
  { slug: "dips", name: "Dips", phase: "functional", muscleGroup: "push", equipment: "bodyweight", met: 6, unit: "reps" },
  { slug: "push-up", name: "Push-Up", phase: "functional", muscleGroup: "push", equipment: "bodyweight", met: 5.5, unit: "reps" },
  { slug: "pull-up", name: "Pull-Up", phase: "functional", muscleGroup: "pull", equipment: "bodyweight", met: 7, unit: "reps" },
  { slug: "sit-up", name: "Sit-Up", phase: "functional", muscleGroup: "core", equipment: "bodyweight", met: 5, unit: "reps" },
  { slug: "lunge-lateral-raise", name: "Lunge + Lateral Raise", phase: "functional", muscleGroup: "full", equipment: "dumbbell", met: 6, unit: "reps" },
  { slug: "step-up-knee-ohp", name: "Step-Up + Knee Drive + Overhead Press", phase: "functional", muscleGroup: "full", equipment: "dumbbell", met: 6.5, unit: "reps" },
  { slug: "jump-squat", name: "Jump Squat", phase: "functional", muscleGroup: "legs", equipment: "bodyweight", met: 7.5, unit: "reps" },
  // Original library exercises missing from prod DB
  { slug: "kb-swing", name: "Kettlebell Swing", phase: "functional", muscleGroup: "full", equipment: "kettlebell", met: 7, unit: "reps" },
  { slug: "lat-pulldown", name: "Lat Pulldown", phase: "strength", muscleGroup: "pull", equipment: "cable", met: 5, unit: "reps" },
  { slug: "bench-press", name: "Bench Press", phase: "strength", muscleGroup: "push", equipment: "barbell", met: 6, unit: "reps" },
  { slug: "leg-press", name: "Leg Press", phase: "strength", muscleGroup: "legs", equipment: "machine", met: 5.5, unit: "reps" },
  { slug: "overhead-press", name: "Overhead Press", phase: "strength", muscleGroup: "push", equipment: "barbell", met: 6, unit: "reps" },
  { slug: "back-squat", name: "Barbell Squat", phase: "strength", muscleGroup: "legs", equipment: "barbell", met: 6, unit: "reps" },
  { slug: "barbell-row", name: "Barbell Row", phase: "strength", muscleGroup: "pull", equipment: "barbell", met: 6, unit: "reps" },
  { slug: "romanian-deadlift", name: "Romanian Deadlift", phase: "strength", muscleGroup: "legs", equipment: "barbell", met: 6, unit: "reps" },
  { slug: "seated-cable-row", name: "Seated Cable Row", phase: "strength", muscleGroup: "pull", equipment: "cable", met: 5, unit: "reps" },
  { slug: "incline-db-press", name: "Incline Dumbbell Press", phase: "strength", muscleGroup: "push", equipment: "dumbbell", met: 5.5, unit: "reps" },
  { slug: "walking-lunge", name: "Dumbbell Walking Lunge", phase: "strength", muscleGroup: "legs", equipment: "dumbbell", met: 5.5, unit: "reps" },
];

const SESSIONS = [
  {
    date: "2026-08-25",
    label: "Denge & Mobilizasyon",
    dayType: "functional",
    exercises: [
      { slug: "roll-up-ball", sets: 3, reps: "10" },
      { slug: "banded-single-leg-circle", sets: 3, reps: "10" },
      { slug: "dead-bug-ball", sets: 3, reps: "10" },
      { slug: "seated-single-leg-lift", sets: 3, reps: "10" },
      { slug: "quadruped-knee-ext", sets: 3, reps: "10" },
      { slug: "quadruped-hip-ext", sets: 3, reps: "10" },
      { slug: "marching-bridge", sets: 3, reps: "10" },
      { slug: "bird-dog", sets: 3, reps: "10" },
      { slug: "overhead-ball-knee-drive", sets: 3, reps: "10" },
    ],
  },
  {
    date: "2026-08-30",
    label: "Fonksiyonel Kardiyo",
    dayType: "functional",
    exercises: [
      { slug: "squat-shoulder-press", sets: 3, reps: "12" },
      { slug: "burpee", sets: 3, reps: "10" },
      { slug: "dips", sets: 3, reps: "10" },
      { slug: "push-up", sets: 3, reps: "15" },
      { slug: "pull-up", sets: 3, reps: "8" },
      { slug: "sit-up", sets: 3, reps: "15" },
      { slug: "lunge-lateral-raise", sets: 3, reps: "12" },
      { slug: "step-up-knee-ohp", sets: 3, reps: "10" },
      { slug: "jump-squat", sets: 3, reps: "12" },
      { slug: "kb-swing", sets: 3, reps: "15" },
    ],
  },
  {
    date: "2026-08-31",
    label: "Kuvvet — Üst Vücut",
    dayType: "strength",
    exercises: [
      { slug: "lat-pulldown", sets: 3, reps: "10" },
      { slug: "upper-back-row", sets: 3, reps: "10" },
      { slug: "bench-press", sets: 3, reps: "10" },
      { slug: "leg-press", sets: 3, reps: "12" },
      { slug: "back-extension", sets: 3, reps: "12" },
      { slug: "overhead-press", sets: 3, reps: "10" },
      { slug: "rear-delt-fly", sets: 3, reps: "12" },
      { slug: "chest-fly", sets: 3, reps: "12" },
      { slug: "lateral-raise", sets: 3, reps: "12" },
      { slug: "preacher-curl", sets: 3, reps: "10" },
      { slug: "triceps-pushdown", sets: 3, reps: "12" },
    ],
  },
];

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({ token: "" }));
  if (token !== "mc-seed-2026-aug-onetime-7x9k") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const coach = await prisma.user.findFirst({ where: { role: "coach" } });
  if (!coach) return NextResponse.json({ error: "no coach user found" }, { status: 404 });

  const client = await prisma.user.findFirst({ where: { email: "emrecakmak@me.com" } });
  if (!client) return NextResponse.json({ error: "client user not found" }, { status: 404 });

  // CoachLink
  const link = await prisma.coachLink.upsert({
    where: { coachId_clientId: { coachId: coach.id, clientId: client.id } },
    update: { status: "active", permissions: JSON.stringify(["workout", "nutrition", "biometric", "activity"]) },
    create: { coachId: coach.id, clientId: client.id, status: "active", permissions: JSON.stringify(["workout", "nutrition", "biometric", "activity"]) },
  });

  // Exercises — upsert all (including originals missing from prod)
  for (const ex of EXERCISES) {
    await prisma.exercise.upsert({ where: { slug: ex.slug }, update: {}, create: ex });
  }

  const allEx = await prisma.exercise.findMany({ select: { id: true, slug: true } });
  const slugMap = Object.fromEntries(allEx.map((e) => [e.slug, e.id]));

  const results: string[] = [`CoachLink: ${link.id}`];

  // Find existing sessions and patch missing sets
  const existingSessions = await prisma.workoutSession.findMany({
    where: { userId: client.id, programId: { not: null } },
    include: { sets: true, program: true },
    orderBy: { scheduledFor: "asc" },
  });

  for (const s of SESSIONS) {
    const targetDate = new Date(s.date + "T09:00:00");
    const existing = existingSessions.find(
      (es) => es.label === s.label && es.scheduledFor.toISOString().startsWith(s.date)
    );

    if (existing) {
      const existingSlugs = new Set(
        existing.sets.map((set) => {
          const ex = allEx.find((e) => e.id === set.exerciseId);
          return ex?.slug;
        })
      );

      let added = 0;
      for (let i = 0; i < s.exercises.length; i++) {
        const ex = s.exercises[i];
        if (existingSlugs.has(ex.slug)) continue;
        const exerciseId = slugMap[ex.slug];
        if (!exerciseId) { results.push(`STILL MISSING: ${ex.slug}`); continue; }
        await prisma.workoutSet.create({
          data: {
            sessionId: existing.id,
            exerciseId,
            phase: s.dayType === "strength" ? "strength" : "activation",
            orderIdx: existing.sets.length + added,
            targetSets: ex.sets,
            targetReps: ex.reps,
          },
        });
        added++;
      }
      results.push(`Patched "${s.label}" (${s.date}): +${added} sets`);
    } else {
      results.push(`Session "${s.label}" not found — skipped`);
    }
  }

  return NextResponse.json({ ok: true, results });
}
