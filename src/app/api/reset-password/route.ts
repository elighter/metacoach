import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const { token, password } = (await req.json()) as { token?: string; password?: string };

  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { passwordResetToken: token } });
  if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
    return NextResponse.json({ error: "Bağlantı geçersiz veya süresi dolmuş." }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hash, passwordResetToken: null, passwordResetExpiry: null },
  });

  return NextResponse.json({ ok: true });
}
