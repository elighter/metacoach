import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";
import { startOfDay } from "@/lib/utils";

const labSchema = z.object({
  kind: z.literal("lab_pdf"),
  fileId: z.string(),
  panelName: z.string(),
  labName: z.string().optional(),
  collectedAt: z.string().optional(),
  biomarkers: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      value: z.number(),
      unit: z.string(),
      refLow: z.number().nullable(),
      refHigh: z.number().nullable(),
      flag: z.enum(["low", "normal", "high"]),
      confidence: z.number(),
    }),
  ),
});

const inbodySchema = z.object({
  kind: z.literal("inbody_img"),
  fileId: z.string(),
  measuredAt: z.string().optional(),
  weightKg: z.number(),
  bodyFatPct: z.number(),
  skeletalMuscleKg: z.number().optional(),
  visceralFat: z.number().optional(),
  bodyWaterPct: z.number().optional(),
  bmrDevice: z.number().optional(),
  impedance: z.number().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const body = await req.json();
  const parsed = z.union([labSchema, inbodySchema]).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri.", detail: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  if (data.kind === "lab_pdf") {
    const lab = await prisma.labResult.create({
      data: {
        userId: user.id,
        fileId: data.fileId,
        panelName: data.panelName,
        labName: data.labName,
        collectedAt: data.collectedAt ? new Date(data.collectedAt) : null,
        parseConfidence: 0.96,
        confirmedAt: new Date(),
        biomarkers: {
          create: data.biomarkers.map((b) => ({
            code: b.code,
            name: b.name,
            value: b.value,
            unit: b.unit,
            refLow: b.refLow,
            refHigh: b.refHigh,
            flag: b.flag,
            confidence: b.confidence,
          })),
        },
      },
    });
    return NextResponse.json({ ok: true, id: lab.id });
  }

  const measuredAt = data.measuredAt ? new Date(data.measuredAt) : new Date();
  const bio = await prisma.biometric.create({
    data: {
      userId: user.id,
      fileId: data.fileId,
      source: "inbody",
      measuredAt,
      weightKg: data.weightKg,
      bodyFatPct: data.bodyFatPct,
      skeletalMuscleKg: data.skeletalMuscleKg,
      visceralFat: data.visceralFat,
      bodyWaterPct: data.bodyWaterPct,
      bmrDevice: data.bmrDevice,
      impedance: data.impedance,
    },
  });
  // Reflect the fresh weight into today's rollup so TDEE picks it up.
  const day = startOfDay(measuredAt);
  await prisma.dailyLog.upsert({
    where: { userId_date: { userId: user.id, date: day } },
    create: { userId: user.id, date: day, weightTrend: data.weightKg },
    update: { weightTrend: data.weightKg },
  });
  return NextResponse.json({ ok: true, id: bio.id });
}
