import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";
import { serializePermissions } from "@/lib/coach";

const schema = z.object({
  permissions: z.array(z.string()).optional(),
  revoke: z.boolean().optional(),
});

// Danışan koçunun modül izinlerini günceller ya da bağlantıyı kaldırır.
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const link = await prisma.coachLink.findFirst({
    where: { clientId: user.id, status: "active" },
  });
  if (!link) {
    return NextResponse.json({ error: "Bağlı koç yok." }, { status: 404 });
  }

  if (parsed.data.revoke) {
    await prisma.coachLink.update({ where: { id: link.id }, data: { status: "revoked" } });
    return NextResponse.json({ ok: true, revoked: true });
  }

  await prisma.coachLink.update({
    where: { id: link.id },
    data: { permissions: serializePermissions(parsed.data.permissions ?? []) },
  });
  return NextResponse.json({ ok: true });
}
