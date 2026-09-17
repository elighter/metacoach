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

  const todayStart = startOfDay(new Date());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);

  const [logs, biometrics, todayMeals, yesterdayMeals, lab, estimates] = await Promise.all([
    prisma.dailyLog.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 90 }).then((r) => r.reverse()),
    prisma.biometric.findMany({ where: { userId }, orderBy: { measuredAt: "asc" } }),
    prisma.meal.findMany({
      where: { userId, loggedAt: { gte: todayStart } },
      orderBy: { loggedAt: "asc" },
    }),
    prisma.meal.findMany({
      where: { userId, loggedAt: { gte: yesterdayStart, lt: todayStart } },
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

  // ── Nutrition: today (or yesterday if today is empty) ──
  const sumMeals = (meals: typeof todayMeals) =>
    meals.reduce(
      (a, m) => ({ kcal: a.kcal + m.totalKcal, protein: a.protein + m.proteinG, carb: a.carb + m.carbG, fat: a.fat + m.fatG }),
      { kcal: 0, protein: 0, carb: 0, fat: 0 },
    );
  const todayConsumed = sumMeals(todayMeals);
  const hasTodayNutrition = todayConsumed.kcal > 0;
  const consumed = hasTodayNutrition ? todayConsumed : sumMeals(yesterdayMeals);
  const nutritionDay: "today" | "yesterday" = hasTodayNutrition || yesterdayMeals.length === 0 ? "today" : "yesterday";
  const target = tdee.tdee + (user.goal === "cut" ? -450 : user.goal === "bulk" ? 300 : 0);
  const macroTarget = {
    protein: Math.round((latestBio?.weightKg ?? 80) * 2),
    fat: Math.round((target * 0.28) / 9),
    carb: Math.round((target - (latestBio?.weightKg ?? 80) * 2 * 4 - target * 0.28) / 4),
  };

  // ── Workout: next session + weekly adherence + recent (imported/completed) ──
  const [nextSession, completedThisWeek, recentSessions, appleHealth, coachProgram, todayWorkouts] = await Promise.all([
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
    prisma.workoutProgram.findFirst({ where: { userId, source: "coach", active: true }, select: { id: true, name: true } }),
    prisma.workoutSession.findMany({
      where: { userId, status: "completed", scheduledFor: todayStart },
      select: { label: true, estKcal: true },
    }),
  ]);
  const workout = {
    hasSession: !!nextSession,
    label: nextSession?.label ?? null,
    dayType: nextSession?.dayType ?? null,
    scheduledFor: nextSession?.scheduledFor.toISOString() ?? null,
    exerciseCount: nextSession?._count.sets ?? 0,
    completedThisWeek,
    hasCoachProgram: !!coachProgram,
    coachProgramName: coachProgram?.name ?? null,
    todayWorkouts: todayWorkouts.map((w) => w.label),
  };

  // ── Aktivite (Apple Health / wearable) — bugün boşsa dünü göster ──
  const todayKey = todayStart.getTime();
  const yesterdayKey = yesterdayStart.getTime();
  const todayLog = logs.find((l) => startOfDay(l.date).getTime() === todayKey) ?? null;
  const yesterdayLog = logs.find((l) => startOfDay(l.date).getTime() === yesterdayKey) ?? null;
  const hasTodayActivity = (todayLog?.activeKcal ?? 0) > 0 || (todayLog?.steps ?? 0) > 0;
  const displayLog = hasTodayActivity ? todayLog : yesterdayLog;
  const activityDay: "today" | "yesterday" = hasTodayActivity || !yesterdayLog ? "today" : "yesterday";
  const cutoff7 = daysAgo(7).getTime();
  const last7 = logs.filter((l) => l.date.getTime() >= cutoff7);
  const activeVals = last7.map((l) => l.activeKcal).filter((v) => v > 0);
  const stepVals = last7.map((l) => l.steps).filter((v) => v > 0);
  const activity = {
    hasData: logs.some((l) => l.activeKcal > 0 || l.steps > 0),
    day: activityDay,
    todayActiveKcal: Math.round(displayLog?.activeKcal ?? 0),
    todaySteps: displayLog?.steps ?? 0,
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

  // ── Nudges: contextual coaching insights ──
  const remainingKcal = Math.max(0, target - consumed.kcal);
  const remainingProtein = Math.max(0, macroTarget.protein - consumed.protein);
  const proteinPct = macroTarget.protein > 0 ? Math.round((consumed.protein / macroTarget.protein) * 100) : 0;
  const now = new Date();
  const hour = now.getHours();
  const mealsLeft = hour < 10 ? 3 : hour < 14 ? 2 : hour < 20 ? 1 : 0;
  const perMealKcal = mealsLeft > 0 ? Math.round(remainingKcal / mealsLeft) : 0;

  const nudges: { widget: string; text: string }[] = [];

  if (hasTodayNutrition && mealsLeft > 0 && remainingKcal > 200) {
    const proteinHint = remainingProtein > 20 ? ` — ${Math.round(remainingProtein)}g protein öncelikle` : "";
    nudges.push({
      widget: "caloriesToday",
      text: `Kalan ${mealsLeft} öğün için ~${perMealKcal} kcal/öğün hedefle${proteinHint}.`,
    });
  } else if (hasTodayNutrition && remainingKcal <= 200 && remainingKcal >= 0) {
    nudges.push({ widget: "caloriesToday", text: "Günlük hedefe ulaştın, aferin!" });
  } else if (hasTodayNutrition && consumed.kcal > target * 1.1) {
    nudges.push({ widget: "caloriesToday", text: `Hedefin ${Math.round(consumed.kcal - target)} kcal üstünde — yarın dengeleyebilirsin.` });
  }

  if (!hasTodayNutrition && hour >= 10) {
    nudges.push({ widget: "caloriesToday", text: "Bugün henüz öğün kaydı yok — kayıt tutmak farkındalığı artırır." });
  }

  if (todayWorkouts.length > 0) {
    nudges.push({ widget: "nextWorkout", text: `Bugün ${todayWorkouts[0]} tamamlandı!` });
  } else if (coachProgram && completedThisWeek < 3) {
    const remaining = 3 - completedThisWeek;
    nudges.push({ widget: "nextWorkout", text: `Bu hafta ${remaining} antrenman kaldı — bugün yapabilirsin.` });
  }

  if (weightDelta != null) {
    if (user.goal === "cut" && weightDelta > 0.3) {
      nudges.push({ widget: "weight", text: `Kesim hedefin için kilo artışı var — kalori açığını gözden geçir.` });
    } else if (user.goal === "cut" && weightDelta <= 0) {
      nudges.push({ widget: "weight", text: `Kesim hedefine uyumlu gidiyorsun, devam et.` });
    } else if (user.goal === "bulk" && weightDelta < 0) {
      nudges.push({ widget: "weight", text: `Kütle hedefin için kalori fazlasını artırabilirsin.` });
    } else if (user.goal === "maintain" && Math.abs(weightDelta) <= 0.5) {
      nudges.push({ widget: "weight", text: `Kilo stabil — koruma hedefine uyumlu.` });
    }
  }

  // ── Coach Brief: conversational coaching insights for adaptiveInsight ──
  type CoachCard = { emoji: string; tag: string; tone: "good" | "warn" | "info" | "crit"; text: string; action?: string };
  const coachCards: CoachCard[] = [];

  // 1. Protein insight
  if (hasTodayNutrition) {
    if (proteinPct >= 100) {
      coachCards.push({ emoji: "💪", tag: "Protein", tone: "good", text: `Bugün ${consumed.protein}g protein aldın — hedefin ${macroTarget.protein}g'ı geçtin. Kas sentezi için ideal.` });
    } else if (proteinPct >= 70) {
      const perMealProtein = mealsLeft > 0 ? Math.round(remainingProtein / mealsLeft) : Math.round(remainingProtein);
      coachCards.push({ emoji: "🥩", tag: "Protein", tone: "info", text: `${consumed.protein}g / ${macroTarget.protein}g protein. Kalan ${Math.round(remainingProtein)}g için ${mealsLeft > 0 ? `${mealsLeft} öğünde ~${perMealProtein}g/öğün` : "bir atıştırmalık"} yeterli.`, action: mealsLeft > 0 ? "Yoğurt, yumurta veya tavuk ekle" : undefined });
    } else if (proteinPct > 0) {
      coachCards.push({ emoji: "⚠️", tag: "Protein düşük", tone: "warn", text: `Henüz ${consumed.protein}g protein — hedefin ${macroTarget.protein}g. ${user.goal === "cut" ? "Kesimde kas kaybını önlemek için protein kritik." : "Kas onarımı için proteini artır."}`, action: `Kalan öğünleri protein ağırlıklı planla (~${mealsLeft > 0 ? Math.round(remainingProtein / mealsLeft) : Math.round(remainingProtein)}g/öğün)` });
    }
  }

  // 2. Nutrition balance — kalori + macro harmony
  if (hasTodayNutrition && consumed.kcal > 0) {
    const calPct = Math.round((consumed.kcal / target) * 100);
    if (consumed.kcal > target * 1.15) {
      const overBy = Math.round(consumed.kcal - target);
      coachCards.push({ emoji: "📊", tag: "Kalori", tone: "warn", text: `Hedefin ${overBy} kcal üstünde (%${calPct}). ${user.goal === "cut" ? "Yarın biraz daha az alarak haftalık ortalamayı dengeleyebilirsin." : "Bu bir gün için sorun değil — haftalık ortalamanı takip et."}` });
    } else if (calPct >= 85 && calPct <= 105) {
      coachCards.push({ emoji: "🎯", tag: "Kalori", tone: "good", text: `Hedefin %${calPct}'ında — tam doğru yoldasın. ${mealsLeft > 0 ? `${mealsLeft} öğün daha var.` : "Günü güzel kapattın."}` });
    } else if (mealsLeft === 0 && calPct < 75) {
      coachCards.push({ emoji: "📉", tag: "Kalori az", tone: "warn", text: `Bugün sadece ${consumed.kcal} kcal aldın (%${calPct}). ${user.goal === "cut" ? "Çok düşük kalori metabolizmayı yavaşlatır — hedefin altında kalma." : "Yetersiz beslenme toparlanmayı geciktirir."}` });
    }
  } else if (!hasTodayNutrition && hour >= 10) {
    coachCards.push({ emoji: "📝", tag: "Kayıt yok", tone: "info", text: `Bugün henüz öğün kaydı yok. ${hour >= 14 ? "Geç kalmadan kayıt tutmak farkındalığı artırır." : "İlk öğününü kaydet — geri kalan kendini tamamlar."}`, action: "Beslenme kaydı ekle" });
  }

  // 3. Workout insight
  if (todayWorkouts.length > 0) {
    const wKcal = todayWorkouts.reduce((s, w) => s + (w.estKcal ?? 0), 0);
    coachCards.push({ emoji: "🔥", tag: "Antrenman", tone: "good", text: `Bugün ${todayWorkouts[0].label} tamamlandı${wKcal > 0 ? ` (~${wKcal} kcal yakıldı)` : ""}! ${completedThisWeek >= 3 ? "Bu hafta hedefini tamamladın." : `Bu hafta ${completedThisWeek}/3 seans.`}` });
  } else if (coachProgram) {
    if (completedThisWeek >= 3) {
      coachCards.push({ emoji: "🏆", tag: "Antrenman", tone: "good", text: `Bu hafta ${completedThisWeek} seans — hedefini tamamladın. Vücudun toparlanma sürecinde, dinlenmeyi ihmal etme.` });
    } else {
      const remaining = 3 - completedThisWeek;
      coachCards.push({ emoji: "🏋️", tag: "Antrenman", tone: "info", text: `Bu hafta ${completedThisWeek}/3 antrenman. ${remaining > 1 ? `${remaining} seans kaldı` : "Son 1 seans kaldı"} — bugün iyi bir gün olabilir.`, action: "Antrenman kaydet" });
    }
  }

  // 4. Weight trend vs goal
  if (weightDelta != null) {
    const weeklyRate = tdee.weightSlopeKgPerWeek;
    if (user.goal === "cut") {
      if (weeklyRate <= -0.1 && weeklyRate >= -1.0) {
        coachCards.push({ emoji: "📉", tag: "Kilo trendi", tone: "good", text: `Haftada ${Math.abs(weeklyRate).toFixed(1)} kg kayıp — sağlıklı aralıkta. ${Math.abs(weeklyRate) > 0.7 ? "Biraz yavaşlatmak kas kaybını önler." : "Bu tempoyu koru."}` });
      } else if (weeklyRate > 0) {
        coachCards.push({ emoji: "⚖️", tag: "Kilo trendi", tone: "warn", text: `Trend yukarı yönlü (+${weeklyRate.toFixed(1)} kg/hafta). Kalori açığını kontrol et — hedef günlük ~${Math.round(target)} kcal.` });
      }
    } else if (user.goal === "bulk") {
      if (weeklyRate >= 0.1 && weeklyRate <= 0.5) {
        coachCards.push({ emoji: "📈", tag: "Kilo trendi", tone: "good", text: `Haftada +${weeklyRate.toFixed(1)} kg kazanım — kontrollü bulk için ideal tempo.` });
      } else if (weeklyRate < 0) {
        coachCards.push({ emoji: "⚖️", tag: "Kilo trendi", tone: "warn", text: `Kütle hedefin var ama kilo düşüyor. Kalori fazlasını artır — hedefe +300 kcal ekle.` });
      }
    } else if (user.goal === "maintain" && Math.abs(weeklyRate) <= 0.15) {
      coachCards.push({ emoji: "✅", tag: "Denge", tone: "good", text: `Kilo stabil (${weeklyRate > 0 ? "+" : ""}${weeklyRate.toFixed(1)} kg/hafta) — koruma hedefine uyumlu gidiyorsun.` });
    }
  }

  // 5. Activity / movement
  const todayActive = displayLog?.activeKcal ?? 0;
  if (activity.hasData && todayActive > 0) {
    const avgActive = activity.avgActiveKcal;
    if (todayActive > avgActive * 1.3) {
      coachCards.push({ emoji: "⚡", tag: "Aktivite", tone: "good", text: `Bugün ortalamanın %${Math.round(((todayActive - avgActive) / avgActive) * 100)} üstünde aktifsin (${Math.round(todayActive)} kcal). ${hasTodayNutrition ? "Ekstra aktiviteyi beslenmede dengelemeyi unutma." : ""}` });
    } else if (todayActive < avgActive * 0.5 && hour >= 16) {
      coachCards.push({ emoji: "🚶", tag: "Aktivite", tone: "info", text: `Bugün düşük aktivite (${Math.round(todayActive)} kcal / ort. ${Math.round(avgActive)} kcal). Kısa bir yürüyüş bile fark yaratır.` });
    }
  }

  // Determine overall mood
  const goodCount = coachCards.filter((c) => c.tone === "good").length;
  const warnCount = coachCards.filter((c) => c.tone === "warn" || c.tone === "crit").length;
  const coachMood: "great" | "ok" | "alert" = goodCount >= 3 ? "great" : warnCount >= 2 ? "alert" : "ok";
  const greetings: Record<typeof coachMood, string> = {
    great: hour < 12 ? "Günaydın! Harika gidiyorsun 🌟" : hour < 18 ? "Bugün formdasın! 💪" : "Günü güçlü kapattın! 🌙",
    ok: hour < 12 ? "Günaydın! Bugünkü durumun:" : hour < 18 ? "İşte günün özeti:" : "Gün sonu değerlendirmen:",
    alert: hour < 12 ? "Günaydın! Birkaç şeye dikkat edelim:" : "Dikkat etmen gereken noktalar var:",
  };

  const coachBrief = {
    mood: coachMood,
    greeting: greetings[coachMood],
    cards: coachCards,
    proteinPct,
    summary: {
      tdee: tdee.tdee,
      target,
      dataQuality: Math.round(tdee.dataQuality * 100),
      nDays: tdee.nDaysWithCalories,
      weeklySlope: tdee.weightSlopeKgPerWeek,
    },
  };

  return {
    user,
    windowDays,
    tdee,
    mifflin,
    latestBio,
    biometrics,
    chart,
    consumed,
    nutritionDay,
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
    nudges,
    coachBrief,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
