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

  const sessions = await prisma.workoutSession.findMany({
    where: { userId: client.id, source: "coach" },
    orderBy: { scheduledFor: "asc" },
  });

  const results: string[] = [];

  for (const s of sessions) {
    if (s.label === "Fonksiyonel Kardiyo") {
      // 30.08 → 27.08
      await prisma.workoutSession.update({
        where: { id: s.id },
        data: {
          scheduledFor: new Date("2026-08-27T09:00:00"),
          completedAt: new Date("2026-08-27T10:00:00"),
          status: "completed",
        },
      });
      results.push(`Fonksiyonel Kardiyo: 30.08 → 27.08`);
    } else if (s.label === "Kuvvet — Üst Vücut") {
      // 31.08 → 28.08
      await prisma.workoutSession.update({
        where: { id: s.id },
        data: {
          scheduledFor: new Date("2026-08-28T09:00:00"),
          completedAt: new Date("2026-08-28T10:00:00"),
          status: "completed",
        },
      });
      results.push(`Kuvvet — Üst Vücut: 31.08 → 28.08`);
    } else if (s.label === "Denge & Mobilizasyon") {
      // 25.08 correct, just fix completedAt
      await prisma.workoutSession.update({
        where: { id: s.id },
        data: {
          completedAt: new Date("2026-08-25T10:00:00"),
          status: "completed",
        },
      });
      results.push(`Denge & Mobilizasyon: completedAt → 25.08`);
    }
  }

  return NextResponse.json({ ok: true, results });
}
