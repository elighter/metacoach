import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";
import { getCoachAccess } from "@/lib/coach";

const schema = z.object({
  clientId: z.string().min(1),
  body: z.string().min(1).max(4000),
});

// Koç ↔ danışan yorum akışı. Yazan taraf role/erişime göre belirlenir.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz yorum." }, { status: 400 });
  }
  const { clientId, body } = parsed.data;

  let coachId: string;
  let authorRole: "coach" | "client";

  if (user.id === clientId) {
    // Danışan kendi akışına yazıyor.
    const link = await prisma.coachLink.findFirst({ where: { clientId, status: "active" } });
    if (!link) return NextResponse.json({ error: "Bağlı koç yok." }, { status: 403 });
    coachId = link.coachId;
    authorRole = "client";
  } else {
    // Koç danışanın akışına yazıyor.
    const access = await getCoachAccess(user.id, clientId);
    if (!access) return NextResponse.json({ error: "Erişim yok." }, { status: 403 });
    coachId = user.id;
    authorRole = "coach";
  }

  await prisma.coachComment.create({ data: { clientId, coachId, authorRole, body } });
  return NextResponse.json({ ok: true });
}
