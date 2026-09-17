import { NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib/db";
import { computeTdee, type DailyPoint } from "@/lib/tdee";
import { ageFromDob } from "@/lib/utils";

// Recomputes Dynamic TDEE from the user's logs and persists a MetabolismEstimate.
// In production this is the FastAPI "Metabolism Engine" triggered on a schedule.
export async function POST() {
  const user = await getCurrentUser();
  const settings = await prisma.settings.findUnique({ where: { userId: user.id } });
  const windowDays = settings?.tdeeWindowDays ?? 21;

  const [logs, latestBio] = await Promise.all([
    prisma.dailyLog.findMany({ where: { userId: user.id }, orderBy: { date: "asc" }, take: 90 }),
    prisma.biometric.findFirst({ where: { userId: user.id }, orderBy: { measuredAt: "desc" } }),
  ]);

  const days: DailyPoint[] = logs.map((l) => ({
    date: l.date,
    caloriesIn: l.caloriesIn,
    weightKg: l.weightTrend,
  }));

  const result = computeTdee({
    days,
    windowDays,
    sex: user.sex,
    age: ageFromDob(user.dob),
    heightCm: user.heightCm,
    activityBase: user.activityBase,
    latestBodyFatPct: latestBio?.bodyFatPct ?? null,
    latestWeightKg: latestBio?.weightKg ?? null,
  });

  const estimate = await prisma.metabolismEstimate.create({
    data: {
      userId: user.id,
      windowDays,
      tdeeKcal: result.tdee,
      ciLow: result.ciLow,
      ciHigh: result.ciHigh,
      method: result.method,
      weightSlope: result.weightSlopeKgPerWeek,
      rhoUsed: result.rhoUsed,
    },
  });

  return NextResponse.json({ ok: true, estimate, result });
}
