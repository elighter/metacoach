import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";
import { getCoachAccess } from "@/lib/coach";
import { estimateSessionKcal } from "@/lib/workout";

const schema = z.object({
  clientId: z.string().min(1),
  sessions: z
    .array(
      z.object({
        date: z.string().min(4), // ISO gün
        label: z.string().min(1).max(120),
        dayType: z.string().min(1).max(40),
        exercises: z
          .array(
            z.object({
              slug: z.string().min(1),
              targetSets: z.number().int().min(1).max(12),
              targetReps: z.string().min(1).max(40),
            }),
          )
          .min(1),
      }),
    )
    .min(1)
    .max(14),
});

// Koç, danışan için haftalık yapılandırılmış program oluşturur.
// Her gün bir WorkoutSession(source="coach") + WorkoutSet'ler; kalori MET ile hesaplanır.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz program." }, { status: 400 });
  }
  const { clientId, sessions } = parsed.data;

  const access = await getCoachAccess(user.id, clientId);
  if (!access) {
    return NextResponse.json({ error: "Bu danışana erişimin yok." }, { status: 403 });
  }

  // Egzersizleri slug → {id, met, phase} olarak çöz.
  const slugs = [...new Set(sessions.flatMap((s) => s.exercises.map((e) => e.slug)))];
  const exercises = await prisma.exercise.findMany({ where: { slug: { in: slugs } } });
  const bySlug = new Map(exercises.map((e) => [e.slug, e]));
  const missing = slugs.filter((s) => !bySlug.has(s));
  if (missing.length) {
    return NextResponse.json({ error: `Bilinmeyen hareket: ${missing.join(", ")}` }, { status: 400 });
  }

  const bio = await prisma.biometric.findFirst({
    where: { userId: clientId },
    orderBy: { measuredAt: "desc" },
    select: { weightKg: true },
  });
  const bodyKg = bio?.weightKg ?? 80;

  // Tek aktif koç programı: öncekileri pasifle, yenisini oluştur.
  await prisma.workoutProgram.updateMany({ where: { userId: clientId, active: true }, data: { active: false } });
  const program = await prisma.workoutProgram.create({
    data: {
      userId: clientId,
      name: `Koç programı — ${user.name}`,
      goal: "maintain",
      source: "coach",
      active: true,
      notes: "Koçun hazırladığı haftalık program.",
    },
  });

  for (const s of sessions) {
    const setInputs = s.exercises.map((e, i) => {
      const ex = bySlug.get(e.slug)!;
      return { exercise: ex, phase: ex.phase, orderIdx: i, targetSets: e.targetSets, targetReps: e.targetReps };
    });
    const estKcal = estimateSessionKcal(
      setInputs.map((si) => ({ met: si.exercise.met, phase: si.phase, targetSets: si.targetSets })),
      bodyKg,
    );
    await prisma.workoutSession.create({
      data: {
        userId: clientId,
        programId: program.id,
        scheduledFor: new Date(s.date),
        dayType: s.dayType,
        label: s.label,
        status: "planned",
        source: "coach",
        estKcal,
        sets: {
          create: setInputs.map((si) => ({
            exerciseId: si.exercise.id,
            phase: si.phase,
            orderIdx: si.orderIdx,
            targetSets: si.targetSets,
            targetReps: si.targetReps,
          })),
        },
      },
    });
  }

  return NextResponse.json({ ok: true, sessions: sessions.length });
}
