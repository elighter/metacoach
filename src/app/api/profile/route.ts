import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).optional(),
  dob: z.string().nullable().optional(),
  sex: z.enum(["male", "female", "other"]).nullable().optional(),
  heightCm: z.number().min(80).max(260).nullable().optional(),
  activityBase: z.enum(["sedentary", "light", "moderate", "active", "athlete"]).optional(),
  goal: z.enum(["cut", "maintain", "bulk"]).optional(),
  unitPref: z.enum(["metric", "imperial"]).optional(),
  locale: z.enum(["tr", "en"]).optional(),
});

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz profil." }, { status: 400 });
  }
  const { dob, ...rest } = parsed.data;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { ...rest, ...(dob !== undefined ? { dob: dob ? new Date(dob) : null } : {}) },
  });
  return NextResponse.json({ ok: true, user: { ...updated, dob: updated.dob } });
}
