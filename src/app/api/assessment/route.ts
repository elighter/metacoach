import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Saat HH:MM biçiminde olmalı")
  .nullable()
  .optional();

const num = z.number().min(0).max(100000).nullable().optional();

const schema = z.object({
  dietRecall: z.string().max(4000).nullable().optional(),
  wakeTime: time,
  sleepTime: time,
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "athlete"]).nullable().optional(),
  routineNote: z.string().max(2000).nullable().optional(),
  b12: num,
  vitaminD: num,
  fastingInsulin: num,
  homaIR: num,
  tsh: num,
  labNote: z.string().max(2000).nullable().optional(),
  // "submit" → görüşmeye hazır olarak işaretle; aksi halde taslak kaydet.
  submit: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz değerlendirme verisi." }, { status: 400 });
  }

  const { submit, ...fields } = parsed.data;
  const data = {
    ...fields,
    status: submit ? "submitted" : "draft",
    submittedAt: submit ? new Date() : null,
  };

  const saved = await prisma.coachAssessment.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  return NextResponse.json({ ok: true, status: saved.status });
}
