import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { defaultLayout } from "@/lib/widgets";

const schema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalı."),
  email: z.string().email("Geçerli bir e-posta girin."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı."),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, email, password } = parsed.data;
  const normEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normEmail } });
  if (existing) {
    return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      email: normEmail,
      passwordHash,
      disclaimerAt: new Date(),
      settings: { create: {} },
      dashboardLayout: { create: { widgets: JSON.stringify(defaultLayout()) } },
      consents: {
        create: [
          { type: "kvkk", version: "1.0" },
          { type: "health_data", version: "1.0" },
        ],
      },
    },
  });

  return NextResponse.json({ ok: true });
}
