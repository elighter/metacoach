import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";
import { miBodyComposition } from "@/lib/mi-scale";
import { ageFromDob, startOfDay } from "@/lib/utils";

const schema = z.object({
  weightKg: z.number().min(20).max(400),
  impedance: z.number().min(100).max(1200),
  source: z.enum(["ble", "simulated"]).default("simulated"),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz ölçüm." }, { status: 400 });
  }
  const { weightKg, impedance } = parsed.data;

  const comp = miBodyComposition({
    weightKg,
    impedance,
    heightCm: user.heightCm ?? 175,
    age: ageFromDob(user.dob),
    sex: user.sex,
  });

  const measuredAt = new Date();
  const bio = await prisma.biometric.create({
    data: {
      userId: user.id,
      source: "mi_scale",
      measuredAt,
      weightKg: comp.weightKg,
      bodyFatPct: comp.bodyFatPct,
      skeletalMuscleKg: comp.skeletalMuscleKg,
      visceralFat: comp.visceralFat,
      bodyWaterPct: comp.bodyWaterPct,
      bmrDevice: comp.bmr,
      impedance: comp.impedance,
    },
  });

  const day = startOfDay(measuredAt);
  await prisma.dailyLog.upsert({
    where: { userId_date: { userId: user.id, date: day } },
    create: { userId: user.id, date: day, weightTrend: comp.weightKg },
    update: { weightTrend: comp.weightKg },
  });

  await prisma.deviceConnection.updateMany({
    where: { userId: user.id, provider: "mi_scale" },
    data: { lastSyncAt: measuredAt, status: "connected" },
  });

  return NextResponse.json({ ok: true, id: bio.id, composition: comp });
}
