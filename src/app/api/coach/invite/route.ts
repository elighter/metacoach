import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/db";
import { upsertInvite } from "@/lib/coach";

const schema = z.object({ permissions: z.array(z.string()).optional() });

// Danışan, önden seçtiği modül izinleriyle bir davet kodu/linki üretir/günceller.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  const permissions = parsed.success ? parsed.data.permissions ?? [] : [];
  const code = await upsertInvite(user.id, permissions);
  return NextResponse.json({ ok: true, code });
}
