import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({ token: "" }));
  if (token !== "mc-patch-2026-sep-7k3x") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = await prisma.user.findFirst({ where: { email: "emrecakmak@me.com" } });
  if (!client) return NextResponse.json({ error: "client not found" }, { status: 404 });

  // Fix session source from "planned" to "coach" for coach-created program
  const updated = await prisma.workoutSession.updateMany({
    where: {
      userId: client.id,
      source: "planned",
      program: { source: "coach" },
    },
    data: { source: "coach" },
  });

  return NextResponse.json({ ok: true, updatedSessions: updated.count });
}
