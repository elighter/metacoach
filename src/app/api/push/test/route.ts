import { NextResponse } from "next/server";
import { prisma, getCurrentUser } from "@/lib/db";
import { pushConfigured, sendPush } from "@/lib/push";

export async function POST() {
  const user = await getCurrentUser();
  if (!pushConfigured()) {
    return NextResponse.json({ error: "Sunucuda VAPID anahtarları tanımlı değil." }, { status: 400 });
  }
  const subs = await prisma.pushSubscription.findMany({ where: { userId: user.id } });
  if (subs.length === 0) {
    return NextResponse.json({ error: "Önce bildirimleri etkinleştir." }, { status: 400 });
  }

  const payload = {
    title: "MetaCoach ⚖️",
    body: "Günaydın! Bugünkü trend ölçümün için tartılmayı unutma.",
    url: "/biometrics",
  };

  let sent = 0;
  for (const s of subs) {
    const ok = await sendPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, payload);
    if (ok) sent++;
    else await prisma.pushSubscription.delete({ where: { id: s.id } }); // prune dead
  }

  return NextResponse.json({ ok: true, sent });
}
