import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma, getCurrentUser } from "@/lib/db";

// Kullanıcının kişisel aktivite-ingest token'ını (yeniden) üretir. Session korumalı.
// Cihaz (Health Auto Export / Kısayol) bu token'ı webhook'ta kullanır.
export async function POST() {
  const user = await getCurrentUser();
  const token = randomBytes(24).toString("base64url");

  await prisma.healthIngestToken.upsert({
    where: { userId: user.id },
    create: { userId: user.id, token },
    update: { token, lastUsedAt: null },
  });

  return NextResponse.json({ ok: true, token });
}
