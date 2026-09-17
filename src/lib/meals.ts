import { prisma } from "@/lib/db";

/** Recompute a day's calorie total from its meals into the DailyLog rollup. */
export async function syncDailyCalories(userId: string, day: Date) {
  const meals = await prisma.meal.findMany({
    where: { userId, loggedAt: { gte: day, lt: new Date(day.getTime() + 86_400_000) } },
  });
  const caloriesIn = meals.reduce((s, m) => s + m.totalKcal, 0);
  await prisma.dailyLog.upsert({
    where: { userId_date: { userId, date: day } },
    create: { userId, date: day, caloriesIn },
    update: { caloriesIn },
  });
}
