import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";

const schema = z.object({ code: z.string().min(4).max(40) });

// Koç, danışanın davet kodunu girerek bağlanır. Kodu giren kullanıcı koç olur.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz kod." }, { status: 400 });
  }
  const code = parsed.data.code.trim().toUpperCase();

  const invite = await prisma.coachInvite.findUnique({
    where: { code },
    include: { client: { select: { id: true, name: true } } },
  });
  if (!invite) {
    return NextResponse.json({ error: "Kod bulunamadı." }, { status: 404 });
  }
  if (invite.clientId === user.id) {
    return NextResponse.json({ error: "Kendini koç olarak ekleyemezsin." }, { status: 400 });
  }

  // Davetle önden seçilen izinlerle bağlan (danışan sonradan değiştirebilir).
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { role: "coach" } }),
    prisma.coachLink.upsert({
      where: { coachId_clientId: { coachId: user.id, clientId: invite.clientId } },
      create: { coachId: user.id, clientId: invite.clientId, status: "active", permissions: invite.permissions },
      update: { status: "active", permissions: invite.permissions },
    }),
  ]);

  return NextResponse.json({ ok: true, clientName: invite.client.name, clientId: invite.clientId });
}
