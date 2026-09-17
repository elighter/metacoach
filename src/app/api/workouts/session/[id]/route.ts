import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";
import { estimateSessionKcal } from "@/lib/workout";

const schema = z.object({
  status: z.enum(["planned", "in_progress", "completed", "skipped"]),
  durationMin: z.number().int().min(0).max(600).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const session = await prisma.workoutSession.findUnique({
    where: { id },
    include: { sets: { include: { exercise: { select: { met: true } } } } },
  });
  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: "Seans bulunamadı." }, { status: 404 });
  }

  const { status } = parsed.data;
  const data: {
    status: string;
    completedAt: Date | null;
    estKcal?: number | null;
    durationMin?: number | null;
  } = { status, completedAt: status === "completed" ? new Date() : null };

  if (status === "completed") {
    const bio = await prisma.biometric.findFirst({
      where: { userId: user.id },
      orderBy: { measuredAt: "desc" },
      select: { weightKg: true },
    });
    const bodyKg = bio?.weightKg ?? 80;
    const setsForKcal = session.sets.map((s) => ({
      met: s.exercise.met,
      phase: s.phase,
      targetSets: s.targetSets,
    }));
    data.estKcal = estimateSessionKcal(setsForKcal, bodyKg);
    data.durationMin = parsed.data.durationMin ?? Math.round(setsForKcal.length * 4.5);
  } else {
    data.estKcal = null;
    data.durationMin = null;
  }

  const updated = await prisma.workoutSession.update({ where: { id }, data });
  return NextResponse.json({ ok: true, session: updated });
}
