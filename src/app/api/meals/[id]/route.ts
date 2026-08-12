import { NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib/db";
import { startOfDay } from "@/lib/utils";
import { syncDailyCalories } from "@/lib/meals";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const meal = await prisma.meal.findUnique({ where: { id } });
  if (!meal || meal.userId !== user.id) {
    return NextResponse.json({ error: "Öğün bulunamadı." }, { status: 404 });
  }
  await prisma.meal.delete({ where: { id } });
  await syncDailyCalories(user.id, startOfDay(meal.loggedAt));
  return NextResponse.json({ ok: true });
}
