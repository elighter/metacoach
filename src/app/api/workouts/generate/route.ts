import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/db";
import { regenerateProgram } from "@/lib/workout-service";

const schema = z.object({ daysPerWeek: z.number().int().min(2).max(6).optional() });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const daysPerWeek = parsed.success ? parsed.data.daysPerWeek : undefined;
  try {
    const result = await regenerateProgram(user.id, { daysPerWeek });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[workout] generate failed:", err);
    return NextResponse.json({ error: "Program oluşturulamadı. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
