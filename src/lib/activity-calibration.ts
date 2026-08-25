// Aktivite kalibrasyonu — wearable verisinden activityBase'i otomatik türetir.
//
// TASARIM: TDEE motoru (lib/tdee.ts) yakılan kaloriyi doğrudan KULLANMAZ;
// yalnızca alınan kalori + trend kilo + activityBase çarpanını kullanır. Bu
// yüzden aktivite verisinin en yüksek değerli kullanımı, kullanıcının elle
// "sedentary/moderate/active" seçmesini ortadan kaldırıp activityBase'i
// ölçülen aktiviteden türetmektir. Yakılan kalori günlük hedefe EKLENMEZ
// (çift sayma önlenir).

import { prisma } from "@/lib/db";
import { daysAgo } from "@/lib/utils";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";

/**
 * Ortalama günlük aktif kalori (birincil) ve adım (ikincil) sinyalinden
 * activityBase kovası türet. Eşikler yetişkin genel popülasyona göre kabaca
 * ayarlanmıştır; aktif kalori yoksa adıma düşer.
 */
export function suggestActivityBase(meanActiveKcal: number | null, meanSteps: number | null): ActivityLevel | null {
  if ((meanActiveKcal == null || meanActiveKcal <= 0) && (meanSteps == null || meanSteps <= 0)) {
    return null; // sinyal yok — dokunma
  }

  let byKcal: ActivityLevel | null = null;
  if (meanActiveKcal != null && meanActiveKcal > 0) {
    if (meanActiveKcal < 200) byKcal = "sedentary";
    else if (meanActiveKcal < 400) byKcal = "light";
    else if (meanActiveKcal < 600) byKcal = "moderate";
    else if (meanActiveKcal < 900) byKcal = "active";
    else byKcal = "athlete";
  }

  let bySteps: ActivityLevel | null = null;
  if (meanSteps != null && meanSteps > 0) {
    if (meanSteps < 5000) bySteps = "sedentary";
    else if (meanSteps < 7500) bySteps = "light";
    else if (meanSteps < 10000) bySteps = "moderate";
    else if (meanSteps < 12500) bySteps = "active";
    else bySteps = "athlete";
  }

  if (byKcal && bySteps) {
    // İkisinin ortalamasını al (kova indeksinde), yukarı yuvarla.
    const order: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "athlete"];
    const idx = Math.round((order.indexOf(byKcal) + order.indexOf(bySteps)) / 2);
    return order[idx];
  }
  return byKcal ?? bySteps;
}

export interface CalibrationResult {
  changed: boolean;
  from: string;
  to: string;
  meanActiveKcal: number | null;
  meanSteps: number | null;
}

/**
 * Kullanıcının son `windowDays` günündeki DailyLog aktivitesinden activityBase'i
 * kalibre eder. `activityAuto` kapalıysa (elle override) hiçbir şey yapmaz.
 */
export async function maybeCalibrateActivity(userId: string, windowDays = 28): Promise<CalibrationResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activityBase: true, activityAuto: true },
  });
  const from = user?.activityBase ?? "moderate";
  if (!user || !user.activityAuto) {
    return { changed: false, from, to: from, meanActiveKcal: null, meanSteps: null };
  }

  const logs = await prisma.dailyLog.findMany({
    where: { userId, date: { gte: daysAgo(windowDays) } },
    select: { activeKcal: true, steps: true },
  });

  const kcalVals = logs.map((l) => l.activeKcal).filter((v): v is number => v != null && v > 0);
  const stepVals = logs.map((l) => l.steps).filter((v): v is number => v != null && v > 0);
  const meanActiveKcal = kcalVals.length ? kcalVals.reduce((s, v) => s + v, 0) / kcalVals.length : null;
  const meanSteps = stepVals.length ? stepVals.reduce((s, v) => s + v, 0) / stepVals.length : null;

  const suggestion = suggestActivityBase(meanActiveKcal, meanSteps);
  if (!suggestion || suggestion === from) {
    return { changed: false, from, to: from, meanActiveKcal, meanSteps };
  }

  await prisma.user.update({ where: { id: userId }, data: { activityBase: suggestion } });
  return { changed: true, from, to: suggestion, meanActiveKcal, meanSteps };
}
