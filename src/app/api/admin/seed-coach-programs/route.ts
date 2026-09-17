import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { EXERCISE_LIBRARY } from "@/lib/workout-library";
import { COACH_TEMPLATES } from "@/lib/coach-programs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({ token: "" }));
  const adminToken = process.env.ADMIN_PATCH_TOKEN;
  if (!adminToken || token !== adminToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const clientEmail = process.env.ADMIN_CLIENT_EMAIL;
  if (!clientEmail) return NextResponse.json({ error: "ADMIN_CLIENT_EMAIL not set" }, { status: 500 });
  const client = await prisma.user.findFirst({
    where: { email: clientEmail },
  });
  if (!client) {
    return NextResponse.json({ error: "client not found" }, { status: 404 });
  }

  const neededSlugs = new Set(
    COACH_TEMPLATES.flatMap((t) => t.exercises.map((e) => e.slug)),
  );
  const existing = await prisma.exercise.findMany({
    where: { slug: { in: [...neededSlugs] } },
    select: { slug: true },
  });
  const existingSet = new Set(existing.map((e) => e.slug));

  const toCreate = EXERCISE_LIBRARY.filter(
    (e) => neededSlugs.has(e.slug) && !existingSet.has(e.slug),
  );
  if (toCreate.length > 0) {
    await prisma.exercise.createMany({
      data: toCreate.map((e) => ({
        slug: e.slug,
        name: e.name,
        phase: e.phase,
        muscleGroup: e.muscleGroup,
        equipment: e.equipment,
        met: e.met,
        unit: e.unit,
        instructionTr: e.instructionTr ?? null,
      })),
    });
  }

  await prisma.workoutProgram.updateMany({
    where: { userId: client.id, active: true },
    data: { active: false },
  });

  const program = await prisma.workoutProgram.create({
    data: {
      userId: client.id,
      name: "Koç — 3 Günlük Program",
      goal: "maintain",
      daysPerWeek: 3,
      source: "coach",
      active: true,
      notes:
        "3 farklı antrenman: Denge/Mobilizasyon, Fonksiyonel Kardiyo, Kuvvet Üst Vücut. Haftada 3 gün dönüşümlü.",
    },
  });

  return NextResponse.json({
    ok: true,
    programId: program.id,
    exercisesCreated: toCreate.length,
    templates: COACH_TEMPLATES.map((t) => t.label),
  });
}
