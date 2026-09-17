import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";

const schema = z.object({
  done: z.boolean().optional(),
  weightKg: z.number().min(0).max(1000).nullable().optional(),
  actualReps: z.string().max(24).nullable().optional(),
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
  const set = await prisma.workoutSet.findUnique({
    where: { id },
    include: { session: { select: { userId: true } } },
  });
  if (!set || set.session.userId !== user.id) {
    return NextResponse.json({ error: "Set bulunamadı." }, { status: 404 });
  }
  const updated = await prisma.workoutSet.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true, set: updated });
}
