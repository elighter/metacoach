import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";
import { startOfDay } from "@/lib/utils";
import { syncDailyCalories } from "@/lib/meals";

const schema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  name: z.string().min(1),
  totalKcal: z.number().min(0),
  proteinG: z.number().min(0).default(0),
  carbG: z.number().min(0).default(0),
  fatG: z.number().min(0).default(0),
  source: z.enum(["manual", "barcode", "photo", "api"]).default("manual"),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz öğün." }, { status: 400 });
  }
  const now = new Date();
  const meal = await prisma.meal.create({
    data: { userId: user.id, loggedAt: now, ...parsed.data },
  });
  await syncDailyCalories(user.id, startOfDay(now));
  return NextResponse.json({ ok: true, meal });
}
