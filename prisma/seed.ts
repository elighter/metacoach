import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { miBodyComposition } from "../src/lib/mi-scale";
import { defaultLayout } from "../src/lib/widgets";
import { EXERCISE_LIBRARY } from "../src/lib/workout-library";
import { buildSessionPlan, planWeeklyDays, DAY_LABEL } from "../src/lib/workout";

const prisma = new PrismaClient();

// Deterministic RNG so reseeds produce stable, realistic-looking data.
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
const rng = makeRng(42);
const midnight = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

async function main() {
  const email = "emrecakmak@me.com";
  console.log("→ Reseeding MetaCoach demo data…");

  // Clean slate (cascades handle children).
  await prisma.user.deleteMany({ where: { email } });
  await prisma.foodItem.deleteMany({});
  await prisma.exercise.deleteMany({});

  const dob = new Date("1991-05-14");
  const heightCm = 179;
  const sex = "male";
  const age = 34;

  const user = await prisma.user.create({
    data: {
      email,
      name: "Emre Çakmak",
      passwordHash: await bcrypt.hash("metacoach123", 10),
      dob,
      sex,
      heightCm,
      activityBase: "moderate",
      goal: "cut",
      unitPref: "metric",
      locale: "tr",
      themePref: "system",
      disclaimerAt: new Date(),
      settings: { create: { tdeeWindowDays: 21 } },
      dashboardLayout: { create: { widgets: JSON.stringify(defaultLayout()) } },
      consents: {
        create: [
          { type: "kvkk", version: "1.0" },
          { type: "health_data", version: "1.0" },
        ],
      },
      deviceConnections: {
        create: [
          {
            provider: "mi_scale",
            externalId: "MI-BCS2-4F:AC",
            status: "connected",
            lastSyncAt: new Date(),
            meta: JSON.stringify({ model: "Mi Body Composition Scale 2" }),
          },
          { provider: "apple_health", status: "connected", lastSyncAt: new Date() },
        ],
      },
    },
  });

  // ── 28 days of history: declining trend weight + calorie intake ──
  const DAYS = 28;
  let trueWeight = 84.4;
  for (let i = DAYS - 1; i >= 0; i--) {
    const date = midnight(new Date(Date.now() - i * 86_400_000));
    // gentle downward trend with daily water noise
    trueWeight -= 0.085 + (rng() - 0.5) * 0.05;
    const measured = Number((trueWeight + (rng() - 0.5) * 0.7).toFixed(1));

    // ~85% logging adherence
    const logged = rng() > 0.15;
    const caloriesIn = logged ? Math.round(2350 + (rng() - 0.5) * 420) : 0;
    const activeKcal = Math.round(320 + rng() * 340);
    const steps = Math.round(6500 + rng() * 5200);

    // Mi Scale reading roughly every other day
    if (i % 2 === 0 || i < 3) {
      const impedance = Math.round(478 + (rng() - 0.5) * 36);
      const comp = miBodyComposition({ weightKg: measured, impedance, heightCm, age, sex });
      await prisma.biometric.create({
        data: {
          userId: user.id,
          source: "mi_scale",
          measuredAt: new Date(date.getTime() + 7 * 3600_000),
          weightKg: measured,
          bodyFatPct: comp.bodyFatPct,
          skeletalMuscleKg: comp.skeletalMuscleKg,
          visceralFat: comp.visceralFat,
          bodyWaterPct: comp.bodyWaterPct,
          bmrDevice: comp.bmr,
          impedance,
        },
      });
    }

    await prisma.dailyLog.create({
      data: {
        userId: user.id,
        date,
        caloriesIn,
        activeKcal,
        steps,
        weightTrend: measured,
      },
    });
  }

  // ── A confirmed lab result (from an earlier upload) ──
  const labFile = await prisma.fileAsset.create({
    data: {
      userId: user.id,
      kind: "lab_pdf",
      fileName: "kan-tahlili-agustos.pdf",
      mime: "application/pdf",
      size: 184_320,
      storageKey: "seed/kan-tahlili-agustos.pdf",
      parseStatus: "done",
      parseConfidence: 0.96,
    },
  });
  const lab = await prisma.labResult.create({
    data: {
      userId: user.id,
      fileId: labFile.id,
      panelName: "Genel Sağlık + Lipid Paneli",
      labName: "Acıbadem Labmed",
      collectedAt: new Date(Date.now() - 8 * 86_400_000),
      parseConfidence: 0.96,
      confirmedAt: new Date(Date.now() - 7 * 86_400_000),
    },
  });
  const markers = [
    ["GLU", "Açlık Glukoz", 92, "mg/dL", 74, 106, "normal"],
    ["HBA1C", "HbA1c", 5.2, "%", 4.0, 5.6, "normal"],
    ["CHOL", "Total Kolesterol", 208, "mg/dL", 0, 200, "high"],
    ["LDL", "LDL Kolesterol", 142, "mg/dL", 0, 130, "high"],
    ["HDL", "HDL Kolesterol", 48, "mg/dL", 40, 100, "normal"],
    ["TRIG", "Trigliserid", 128, "mg/dL", 0, 150, "normal"],
    ["TSH", "TSH", 1.8, "mIU/L", 0.4, 4.0, "normal"],
    ["VITD", "D Vitamini (25-OH)", 21, "ng/mL", 30, 100, "low"],
    ["FERR", "Ferritin", 96, "ng/mL", 30, 400, "normal"],
    ["B12", "Vitamin B12", 380, "pg/mL", 200, 900, "normal"],
  ] as const;
  for (const [code, name, value, unit, lo, hi, flag] of markers) {
    await prisma.labBiomarker.create({
      data: {
        labResultId: lab.id,
        code,
        name,
        value,
        unit,
        refLow: lo,
        refHigh: hi,
        flag,
        confidence: 0.95,
      },
    });
  }

  // ── Today's meals ──
  const today = midnight(new Date());
  const meals = [
    ["breakfast", "Yulaf + yumurta + muz", 520, 32, 58, 16],
    ["lunch", "Izgara tavuk + bulgur + salata", 680, 62, 64, 18],
    ["snack", "Protein shake + fındık", 340, 34, 18, 14],
    ["dinner", "Somon + tatlı patates + brokoli", 300, 24, 22, 12],
  ] as const;
  let idx = 0;
  for (const [type, name, kcal, p, c, f] of meals) {
    await prisma.meal.create({
      data: {
        userId: user.id,
        loggedAt: new Date(today.getTime() + (8 + idx * 4) * 3600_000),
        mealType: type,
        name,
        totalKcal: kcal,
        proteinG: p,
        carbG: c,
        fatG: f,
        source: "manual",
      },
    });
    idx++;
  }

  // ── Food database (quick-add search) ──
  const foods: [string, number, number, number, number][] = [
    ["Yumurta (haşlanmış)", 155, 13, 1.1, 11],
    ["Tavuk göğsü (ızgara)", 165, 31, 0, 3.6],
    ["Beyaz pirinç (pişmiş)", 130, 2.7, 28, 0.3],
    ["Bulgur pilavı", 83, 3, 18, 0.2],
    ["Tam yağlı yoğurt", 61, 3.5, 4.7, 3.3],
    ["Muz", 89, 1.1, 23, 0.3],
    ["Badem", 579, 21, 22, 50],
    ["Somon (fırın)", 208, 20, 0, 13],
    ["Yulaf ezmesi", 389, 17, 66, 7],
    ["Zeytinyağı", 884, 0, 0, 100],
    ["Tam buğday ekmeği", 247, 13, 41, 3.4],
    ["Whey protein tozu", 400, 80, 8, 6],
  ];
  await prisma.foodItem.createMany({
    data: foods.map(([name, kcal, p, c, f]) => ({
      name,
      kcalPer100g: kcal,
      proteinPer100g: p,
      carbPer100g: c,
      fatPer100g: f,
    })),
  });

  // ── A few weekly metabolism estimates for the history chart ──
  const estimates = [
    [21, 2512, 132, 6810],
    [14, 2538, 148, 6840],
    [7, 2554, 176, 6870],
  ] as const;
  let w = 0;
  for (const [win, tdee, ci, rho] of estimates) {
    await prisma.metabolismEstimate.create({
      data: {
        userId: user.id,
        computedAt: new Date(Date.now() - (2 - w) * 7 * 86_400_000),
        windowDays: win,
        tdeeKcal: tdee,
        ciLow: tdee - ci,
        ciHigh: tdee + ci,
        method: "ewma",
        weightSlope: -0.62,
        rhoUsed: rho,
      },
    });
    w++;
  }

  // ── Exercise library (gym, tagged by 4-phase model) ──
  await prisma.exercise.createMany({ data: EXERCISE_LIBRARY });
  const exercises = await prisma.exercise.findMany();
  const exBySlug = new Map(exercises.map((e) => [e.slug, e]));

  // ── Starter workout program: 3-day A/B, goal-aware (Emre = cut) ──
  const goal = "cut" as const;
  const program = await prisma.workoutProgram.create({
    data: {
      userId: user.id,
      name: "Kesim — 3 Gün A/B",
      goal,
      daysPerWeek: 3,
      source: "template",
      active: true,
      notes: "Full-body A/B dönüşümlü, 4 fazlı periyodizasyon. Kesim için tekrar hacmi ve kardiyo öne çıkar.",
    },
  });
  const dayTypes = planWeeklyDays(3);
  for (let i = 0; i < dayTypes.length; i++) {
    const dayType = dayTypes[i];
    const plan = buildSessionPlan(dayType, i, goal);
    await prisma.workoutSession.create({
      data: {
        userId: user.id,
        programId: program.id,
        scheduledFor: midnight(new Date(Date.now() + i * 2 * 86_400_000)),
        dayType,
        label: DAY_LABEL[dayType],
        status: "planned",
        sets: {
          create: plan
            .filter((s) => exBySlug.has(s.slug))
            .map((s) => ({
              exerciseId: exBySlug.get(s.slug)!.id,
              phase: s.phase,
              orderIdx: s.orderIdx,
              targetSets: s.targetSets,
              targetReps: s.targetReps,
            })),
        },
      },
    });
  }

  // ── Ön değerlendirme (antrenör görüşmesi öncesi hazırlık) ──────────────
  await prisma.coachAssessment.create({
    data: {
      userId: user.id,
      dietRecall:
        "Dün — kahvaltı: 2 yumurta + beyaz peynir + zeytin + tam buğday ekmek; öğle: ızgara tavuk + bulgur pilavı + salata; akşam: mercimek çorbası + yoğurt.\n" +
        "Evvelsi gün — kahvaltı: yulaf + süt + muz; öğle: ton balıklı salata; akşam: fırında somon + sebze.",
      wakeTime: "07:00",
      sleepTime: "23:30",
      activityLevel: "moderate",
      routineNote: "Masa başı iş; haftada 3 gün antrenman, akşamları 30 dk yürüyüş.",
      b12: 310,
      vitaminD: 22,
      fastingInsulin: 9.4,
      homaIR: 1.8,
      tsh: 2.1,
      labNote: "Yaklaşık 3 hafta önce, aç karnına alındı.",
      status: "submitted",
      submittedAt: new Date(),
    },
  });

  // ── Aktivite ingest token + Apple Health cihaz bağlantısı (demo) ────────
  await prisma.healthIngestToken.create({
    data: { userId: user.id, token: "demo-health-token-emre", lastUsedAt: new Date() },
  });
  await prisma.deviceConnection.create({
    data: { userId: user.id, provider: "apple_health", status: "connected", lastSyncAt: new Date() },
  });

  // ── Demo koç + Emre'ye bağlantı + örnek plan/yorum ──────────────────────
  const coachEmail = "coach@metacoach.app";
  await prisma.user.deleteMany({ where: { email: coachEmail } });
  const coach = await prisma.user.create({
    data: {
      name: "Koç Deniz",
      email: coachEmail,
      passwordHash: await bcrypt.hash("metacoach123", 10),
      role: "coach",
      disclaimerAt: new Date(),
    },
  });
  await prisma.coachInvite.create({ data: { clientId: user.id, code: "EMRE123456" } });
  await prisma.coachLink.create({
    data: {
      coachId: coach.id,
      clientId: user.id,
      status: "active",
      permissions: JSON.stringify(["activity", "workout", "nutrition", "metabolism", "assessment"]),
    },
  });
  await prisma.trainingPlan.create({
    data: {
      clientId: user.id,
      coachId: coach.id,
      title: "Hafta 1 — Bazal kuvvet + kardiyo",
      body:
        "Pzt: Üst vücut kuvvet (5x5 bench, row, ohp)\n" +
        "Sal: 40 dk tempolu yürüyüş/kardiyo\n" +
        "Çar: Alt vücut (squat, RDL, lunge)\n" +
        "Per: Dinlenme / esneme\n" +
        "Cum: Full body + core\n" +
        "Not: Antrenman günleri protein 2.0 g/kg. Uyku 7 saat altına düşmesin.",
      active: true,
    },
  });
  await prisma.coachComment.create({
    data: {
      clientId: user.id,
      coachId: coach.id,
      authorRole: "coach",
      body: "Merhaba Emre, ilk hafta planını yükledim. Kardiyo günlerinde nabzını 130-150 aralığında tut. Sorunu buradan yazabilirsin.",
    },
  });

  console.log(`✓ Seeded user ${user.email} with ${DAYS} days of history + ${exercises.length} exercises & a 3-day program.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
