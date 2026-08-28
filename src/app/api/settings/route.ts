import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";

const schema = z.object({
  tdeeWindowDays: z.number().int().min(7).max(56).optional(),
});

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz ayar." }, { status: 400 });
  }
  const settings = await prisma.settings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });
  return NextResponse.json({ ok: true, settings });
}
