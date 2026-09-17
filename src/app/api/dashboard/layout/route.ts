import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";

const schema = z.object({
  widgets: z.array(
    z.object({ id: z.string(), visible: z.boolean(), order: z.number() }),
  ),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz yerleşim." }, { status: 400 });
  }
  await prisma.dashboardLayout.upsert({
    where: { userId: user.id },
    create: { userId: user.id, widgets: JSON.stringify(parsed.data.widgets) },
    update: { widgets: JSON.stringify(parsed.data.widgets) },
  });
  return NextResponse.json({ ok: true });
}
