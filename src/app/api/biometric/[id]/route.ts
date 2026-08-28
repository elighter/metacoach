import { NextResponse } from "next/server";
import { getCurrentUser, prisma } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await params;

  const bio = await prisma.biometric.findUnique({ where: { id } });
  if (!bio || bio.userId !== user.id) {
    return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });
  }

  await prisma.biometric.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
