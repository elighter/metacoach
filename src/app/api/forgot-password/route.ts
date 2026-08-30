import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const { email } = (await req.json()) as { email?: string };
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) {
    return NextResponse.json({ error: "E-posta gerekli." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
    console.log(`[PASSWORD RESET] ${normalized} → ${resetUrl}`);
    // TODO: integrate email provider (Resend, SES, etc.)
  }

  // Always return success to prevent email enumeration
  return NextResponse.json({ ok: true });
}
