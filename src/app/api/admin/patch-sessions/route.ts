import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({ token: "" }));
  if (token !== "mc-patch-dates-9m2x") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = await prisma.user.findFirst({ where: { email: "emrecakmak@me.com" } });
  if (!client) return NextResponse.json({ error: "client not found" }, { status: 404 });

  // Update program notes
  await prisma.workoutProgram.updateMany({
    where: { userId: client.id, source: "coach", active: true },
    data: { notes: "25.08 Denge/Mobilizasyon, 27.08 Fonksiyonel Kardiyo, 28.08 Kuvvet Üst Vücut" },
  });

  return NextResponse.json({ ok: true, result: "program notes updated" });
}
