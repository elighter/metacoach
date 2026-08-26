import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";
import { getCoachAccess } from "@/lib/coach";

const schema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(8000),
});

// Koç, danışanı için yeni bir plan girer. Erişim aktif CoachLink ile doğrulanır.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz plan." }, { status: 400 });
  }
  const { clientId, title, body } = parsed.data;

  const access = await getCoachAccess(user.id, clientId);
  if (!access) {
    return NextResponse.json({ error: "Bu danışana erişimin yok." }, { status: 403 });
  }

  // Yeni plan aktif olur; önceki aktif planlar arşive alınır (tek aktif plan).
  await prisma.$transaction([
    prisma.trainingPlan.updateMany({
      where: { clientId, active: true },
      data: { active: false },
    }),
    prisma.trainingPlan.create({
      data: { clientId, coachId: user.id, title, body, active: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
