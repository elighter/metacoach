import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";
import { estimateSessionKcal } from "@/lib/workout";
import { COACH_TEMPLATE_BY_KEY } from "@/lib/coach-programs";
import { startOfDay } from "@/lib/utils";

const schema = z.object({
  template: z.enum(["mobility", "functional", "strength"]),
  date: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const tpl = COACH_TEMPLATE_BY_KEY[parsed.data.template];
  if (!tpl) {
    return NextResponse.json({ error: "Bilinmeyen program." }, { status: 400 });
  }

  const targetDate = parsed.data.date ? new Date(parsed.data.date) : new Date();
  const dayStart = startOfDay(targetDate);

  const existing = await prisma.workoutSession.findFirst({
    where: {
      userId: user.id,
      scheduledFor: dayStart,
      dayType: tpl.dayType,
      status: "completed",
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Bu program bugün zaten kaydedildi." },
      { status: 409 },
    );
  }

  const slugs = tpl.exercises.map((e) => e.slug);
  const exercises = await prisma.exercise.findMany({
    where: { slug: { in: slugs } },
  });
  const bySlug = new Map(exercises.map((e) => [e.slug, e]));

  const missing = slugs.filter((s) => !bySlug.has(s));
  if (missing.length) {
    return NextResponse.json(
      { error: `Egzersiz bulunamadı: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  const bio = await prisma.biometric.findFirst({
    where: { userId: user.id },
    orderBy: { measuredAt: "desc" },
    select: { weightKg: true },
  });
  const bodyKg = bio?.weightKg ?? 80;

  const program = await prisma.workoutProgram.findFirst({
    where: { userId: user.id, source: "coach", active: true },
  });

  const setInputs = tpl.exercises.map((e, i) => {
    const ex = bySlug.get(e.slug)!;
    return {
      exerciseId: ex.id,
      phase: tpl.phase,
      orderIdx: i,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      done: true,
      met: ex.met,
    };
  });

  const estKcal = estimateSessionKcal(
    setInputs.map((s) => ({
      met: s.met,
      phase: s.phase,
      targetSets: s.targetSets,
    })),
    bodyKg,
  );

  const durationMin = Math.round(setInputs.length * 4.5);

  const session = await prisma.workoutSession.create({
    data: {
      userId: user.id,
      programId: program?.id ?? null,
      scheduledFor: dayStart,
      dayType: tpl.dayType,
      label: tpl.label,
      status: "completed",
      source: "coach",
      completedAt: new Date(),
      durationMin,
      estKcal,
      sets: {
        create: setInputs.map(({ met: _, ...rest }) => rest),
      },
    },
  });

  await prisma.dailyLog.upsert({
    where: { userId_date: { userId: user.id, date: dayStart } },
    update: { activeKcal: { increment: estKcal } },
    create: {
      userId: user.id,
      date: dayStart,
      activeKcal: estKcal,
    },
  });

  return NextResponse.json({ ok: true, session: { id: session.id, estKcal, durationMin } });
}
