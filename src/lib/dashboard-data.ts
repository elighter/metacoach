import { prisma } from "@/lib/db";
import { computeTdee, ewmaSeries, mifflinStJeor, type DailyPoint } from "@/lib/tdee";
import { ageFromDob, startOfDay, daysAgo } from "@/lib/utils";


export interface ChartPoint {
  date: string; // ISO day
  label: string; // "12 Ağu"
  weight: number | null;
  trend: number | null;
  calories: number | null;
  burned: number | null; // günlük yakılan (Apple bazal + aktif); veri yoksa null
}

export async function getDashboardData(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { settings: true },
  });
  const windowDays = user.settings?.tdeeWindowDays ?? 21;

  const [logs, biometrics, todayMeals, lab, estimates] = await Promise.all([
    prisma.dailyLog.findMany({ where: { userId }, orderBy: { date: "asc" }, take: 90 }),
    prisma.biometric.findMany({ where: { userId }, orderBy: { measuredAt: "asc" } }),
    prisma.meal.findMany({
      where: { userId, loggedAt: { gte: startOfDay(new Date()) } },
      orderBy: { loggedAt: "asc" },
    }),
    prisma.labResult.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { biomarkers: true },
    }),
    prisma.metabolismEstimate.findMany({
      where: { userId },
      orderBy: { computedAt: "asc" },
    }),
  ]);

  const latestBio = biometrics[biometrics.length - 1] ?? null;
  const age = ageFromDob(user.dob);

  // ── Chart series with EWMA trend ──
  const weightPts = logs
    .filter((l) => l.weightTrend != null)
    .map((l) => ({ date: l.date, weightKg: l.weightTrend as number }));
  const trendMap = new Map(
    ewmaSeries(weightPts).map((t) => [startOfDay(t.date).getTime(), t.trend]),
  );
  // Dinlenme (bazal) BMR — Apple bazalı olmayan günler için yedek (Katch-McArdle).
  const wKgForBmr = latestBio?.weightKg ?? 80;
  const bfForBmr = latestBio?.bodyFatPct ?? null;
  const lbmForBmr =
    bfForBmr != null
      ? wKgForBmr * (1 - bfForBmr / 100)
      : user.sex === "female"
        ? 0.252 * wKgForBmr + 0.473 * (user.heightCm ?? 165) - 48.3
        : 0.407 * wKgForBmr + 0.267 * (user.heightCm ?? 175) - 19.2;
  const fallbackBmr = Math.round(370 + 21.6 * lbmForBmr);

  const chart: ChartPoint[] = logs.map((l) => {
    const hasActivity = l.basalKcal != null || l.activeKcal > 0;
    const burned = hasActivity ? Math.round((l.basalKcal ?? fallbackBmr) + l.activeKcal) : null;
    return {
      date: l.date.toISOString(),
      label: l.date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      weight: l.weightTrend,
      trend: trendMap.get(startOfDay(l.date).getTime()) ?? null,
      calories: l.caloriesIn > 0 ? l.caloriesIn : null,
      burned,
    };
  });

  // ── Dynamic TDEE ──
  const days: DailyPoint[] = logs.map((l) => ({
    date: l.date,
    caloriesIn: l.caloriesIn,
    weightKg: l.weightTrend,
  }));
  const tdee = computeTdee({
    days,
    windowDays,
    sex: user.sex,
    age,
    heightCm: user.heightCm,
    activityBase: user.activityBase,
    latestBodyFatPct: latestBio?.bodyFatPct ?? null,
    latestWeightKg: latestBio?.weightKg ?? null,
  });

  const mifflin =
    latestBio && user.heightCm
      ? mifflinStJeor({
          weightKg: latestBio.weightKg,
          heightCm: user.heightCm,
          age,
          sex: user.sex,
          activityBase: user.activityBase,
        })
      : null;

  // ── Today's nutrition ──
  const consumed = todayMeals.reduce(
    (a, m) => ({
      kcal: a.kcal + m.totalKcal,
      protein: a.protein + m.proteinG,
      carb: a.carb + m.carbG,
      fat: a.fat + m.fatG,
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0 },
  );
  const target = tdee.tdee + (user.goal === "cut" ? -450 : user.goal === "bulk" ? 300 : 0);
  const macroTarget = {
    protein: Math.round((latestBio?.weightKg ?? 80) * 2),
    fat: Math.round((target * 0.28) / 9),
    carb: Math.round((target - (latestBio?.weightKg ?? 80) * 2 * 4 - target * 0.28) / 4),
  };

  // ── Workout: next session + weekly adherence + recent (imported/completed) ──
  const [nextSession, completedThisWeek, recentSessions, appleHealth] = await Promise.all([
    prisma.workoutSession.findFirst({
      where: { userId, scheduledFor: { gte: startOfDay(new Date()) }, status: { not: "completed" } },
      orderBy: { scheduledFor: "asc" },
      include: { _count: { select: { sets: true } } },
    }),
    prisma.workoutSession.count({
      where: { userId, status: "completed", completedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
    }),
    prisma.workoutSession.findMany({
      where: { userId, status: "completed", completedAt: { gte: daysAgo(14) } },
      orderBy: { completedAt: "desc" },
      take: 8,
    }),
    prisma.deviceConnection.findFirst({ where: { userId, provider: "apple_health" } }),
  ]);
  const workout = {
    hasSession: !!nextSession,
    label: nextSession?.label ?? null,
    dayType: nextSession?.dayType ?? null,
    scheduledFor: nextSession?.scheduledFor.toISOString() ?? null,
    exerciseCount: nextSession?._count.sets ?? 0,
    completedThisWeek,
  };

  // ── Aktivite (Apple Health / wearable) ──
  const todayKey = startOfDay(new Date()).getTime();
  const todayLog = logs.find((l) => startOfDay(l.date).getTime() === todayKey) ?? null;
  const cutoff7 = daysAgo(7).getTime();
  const last7 = logs.filter((l) => l.date.getTime() >= cutoff7);
  const activeVals = last7.map((l) => l.activeKcal).filter((v) => v > 0);
  const stepVals = last7.map((l) => l.steps).filter((v) => v > 0);
  const activity = {
    hasData: logs.some((l) => l.activeKcal > 0 || l.steps > 0),
    todayActiveKcal: Math.round(todayLog?.activeKcal ?? 0),
    todaySteps: todayLog?.steps ?? 0,
    avgActiveKcal: activeVals.length ? Math.round(activeVals.reduce((s, v) => s + v, 0) / activeVals.length) : 0,
    avgSteps: stepVals.length ? Math.round(stepVals.reduce((s, v) => s + v, 0) / stepVals.length) : 0,
    series: logs.slice(-10).map((l) => Math.round(l.activeKcal ?? 0)),
    lastSyncAt: appleHealth?.lastSyncAt ? appleHealth.lastSyncAt.toISOString() : null,
    connected: appleHealth?.status === "connected",
    autoCalibrated: user.activityAuto,
  };
  const recentWorkouts = recentSessions.map((s) => ({
    id: s.id,
    label: s.label,
    dayType: s.dayType,
    source: s.source,
    completedAt: (s.completedAt ?? s.scheduledFor).toISOString(),
    durationMin: s.durationMin,
    estKcal: s.estKcal,
  }));

  // Weight change over window
  const firstTrend = weightPts.length ? trendMap.get(startOfDay(weightPts[0].date).getTime()) : null;
  const lastTrend = tdee.trendWeightKg;
  const weightDelta =
    firstTrend != null && lastTrend != null ? Number((lastTrend - firstTrend).toFixed(1)) : null;

  return {
    user,
    windowDays,
    tdee,
    mifflin,
    latestBio,
    biometrics,
    chart,
    consumed,
    target,
    macroTarget,
    todayMeals,
    lab,
    estimates,
    weightDelta,
    goal: user.goal,
    workout,
    activity,
    recentWorkouts,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
