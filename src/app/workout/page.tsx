import { getCurrentUser, prisma } from "@/lib/db";
import { startOfDay, daysAgo } from "@/lib/utils";
import { PHASE_LABEL, PHASE_HINT, type Phase } from "@/lib/workout-library";
import { trainingDayProtein, type DayType, type Goal } from "@/lib/workout";
import { WorkoutClient, type SessionView } from "@/components/workout-client";
import { WorkoutHistory } from "@/components/workout-history";
import { getClientCoachInfo } from "@/lib/coach";

export const dynamic = "force-dynamic";

const PHASE_ORDER: Phase[] = ["activation", "strength", "functional", "cardio", "cooldown"];

export default async function WorkoutPage() {
  const user = await getCurrentUser();
  const today = startOfDay(new Date());

  const coachInfo = await getClientCoachInfo(user.id);
  const hasCoach = !!coachInfo.coach;

  const [rawProgram, sessions, bio, recent] = await Promise.all([
    prisma.workoutProgram.findFirst({ where: { userId: user.id, active: true } }),
    prisma.workoutSession.findMany({
      where: { userId: user.id, scheduledFor: { gte: daysAgo(7) }, source: hasCoach ? "coach" : undefined },
      orderBy: { scheduledFor: "asc" },
      include: {
        sets: {
          orderBy: { orderIdx: "asc" },
          include: { exercise: true },
        },
      },
    }),
    prisma.biometric.findFirst({ where: { userId: user.id }, orderBy: { measuredAt: "desc" }, select: { weightKg: true } }),
    prisma.workoutSession.findMany({
      where: { userId: user.id, status: "completed", completedAt: { gte: daysAgo(60) } },
      orderBy: { completedAt: "desc" },
      take: 200,
    }),
  ]);

  const program = hasCoach && rawProgram?.source !== "coach" ? null : rawProgram;

  // Today's (or next) actionable session = first not-yet-completed upcoming one.
  const current =
    sessions.find((s) => s.status !== "completed" && new Date(s.scheduledFor) >= today) ??
    sessions.find((s) => s.status !== "completed") ??
    sessions[0] ??
    null;

  let currentView: SessionView | null = null;
  let proteinNote: string | null = null;

  if (current) {
    const groups = new Map<Phase, SessionView["phases"][number]>();
    for (const phase of PHASE_ORDER) {
      const setsInPhase = current.sets.filter((s) => s.phase === phase);
      if (setsInPhase.length === 0) continue;
      groups.set(phase, {
        phase,
        label: PHASE_LABEL[phase],
        hint: PHASE_HINT[phase],
        sets: setsInPhase.map((s) => ({
          id: s.id,
          name: s.exercise.name,
          instruction: s.exercise.instructionTr ?? null,
          equipment: s.exercise.equipment,
          targetSets: s.targetSets,
          targetReps: s.targetReps,
          weightKg: s.weightKg,
          done: s.done,
          showWeight: phase === "strength" || phase === "functional",
        })),
      });
    }
    currentView = {
      id: current.id,
      label: current.label,
      dayType: current.dayType as DayType,
      status: current.status,
      scheduledFor: current.scheduledFor.toISOString(),
      estKcal: current.estKcal,
      durationMin: current.durationMin,
      phases: [...groups.values()],
    };

    const bodyKg = bio?.weightKg ?? 80;
    proteinNote = trainingDayProtein(user.goal as Goal, current.dayType as DayType, bodyKg).note;
  }

  const upcoming = sessions
    .filter((s) => s.id !== current?.id)
    .slice(0, 4)
    .map((s) => ({
      id: s.id,
      label: s.label,
      status: s.status,
      scheduledFor: s.scheduledFor.toISOString(),
    }));

  const recentSessions = recent.map((s) => ({
    id: s.id,
    label: s.label,
    source: s.source,
    completedAt: (s.completedAt ?? s.scheduledFor).toISOString(),
    durationMin: s.durationMin,
    estKcal: s.estKcal,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight">Antrenman</h1>
      <p className="mt-1 text-sm text-ink-3">
        4 fazlı periyodizasyon: hazırlık → ana yüklenme → kardiyo → soğuma. Program hedefine ve ölçümlerine göre uyarlanır.
      </p>

      <WorkoutClient
        program={program ? { name: program.name, source: program.source, notes: program.notes } : null}
        current={currentView}
        upcoming={upcoming}
        proteinNote={proteinNote}
        hasCoach={hasCoach}
      />

      <WorkoutHistory sessions={recentSessions} />
    </div>
  );
}
