import { getCurrentUser, prisma } from "@/lib/db";
import { startOfDay, daysAgo, fmt, fmtDate } from "@/lib/utils";
import { PHASE_LABEL, PHASE_HINT, type Phase } from "@/lib/workout-library";
import { trainingDayProtein, type DayType, type Goal } from "@/lib/workout";
import { WorkoutClient, type SessionView } from "@/components/workout-client";
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
      where: { userId: user.id, scheduledFor: { gte: today }, source: hasCoach ? "coach" : undefined },
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
      where: { userId: user.id, status: "completed", completedAt: { gte: daysAgo(21) }, source: hasCoach ? "coach" : undefined },
      orderBy: { completedAt: "desc" },
      take: 12,
    }),
  ]);

  const program = hasCoach && rawProgram?.source !== "coach" ? null : rawProgram;

  // Today's (or next) actionable session = first not-yet-completed upcoming one.
  const current = sessions.find((s) => s.status !== "completed") ?? sessions[0] ?? null;

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

      {recent.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight">Son antrenmanlar</h2>
          <p className="mt-0.5 text-sm text-ink-3">Tamamlanan seanslar · Apple Health'ten gelenler otomatik işaretlenir.</p>
          <div className="mt-3 flex flex-col gap-2">
            {recent.map((s) => (
              <div key={s.id} className="card flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{s.label}</span>
                    {s.source === "imported" && (
                      <span className="pill bg-primary-wash text-primary-ink">Apple Health</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-3">
                    {fmtDate(s.completedAt ?? s.scheduledFor, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-ink-2">
                  {s.durationMin ? <span className="tabular-nums">{s.durationMin} dk</span> : null}
                  {s.estKcal ? <span className="ml-2 tabular-nums">{fmt(s.estKcal)} kcal</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
