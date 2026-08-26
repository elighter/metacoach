import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/db";
import { ensureInviteCode } from "@/lib/coach";

// Danışan kendi davet kodunu üretir/getirir; koç bu kodla bağlanır.
export async function POST() {
  const user = await getCurrentUser();
  const code = await ensureInviteCode(user.id);
  return NextResponse.json({ ok: true, code });
}
