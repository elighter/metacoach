import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pushConfigured, sendPush } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const REMINDERS = {
  weighIn: {
    title: "MetaCoach ⚖️",
    body: "Günaydın! Bugünkü trend ölçümün için tartılmayı unutma.",
    url: "/biometrics",
  },
  meals: {
    title: "MetaCoach 🍽️",
    body: "Öğün kaydını eklemeyi unutma!",
    url: "/nutrition",
  },
} as const;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!pushConfigured()) {
    return NextResponse.json({ sent: 0, reason: "VAPID not configured" });
  }

  const now = new Date();
  const hour = now.getUTCHours();
  const isMorning = hour >= 4 && hour <= 8;
  const isEvening = hour >= 16 && hour <= 20;

  const users = await prisma.user.findMany({
    where: { role: "user" },
    select: {
      id: true,
      settings: { select: { notifyWeighIn: true, notifyMeals: true } },
      pushSubscriptions: { select: { id: true, endpoint: true, p256dh: true, auth: true } },
    },
  });

  let sent = 0;
  let pruned = 0;

  for (const user of users) {
    if (user.pushSubscriptions.length === 0) continue;
    const s = user.settings;

    const payloads: (typeof REMINDERS)[keyof typeof REMINDERS][] = [];

    if (isMorning && (s?.notifyWeighIn ?? true)) {
      payloads.push(REMINDERS.weighIn);
    }
    if (isEvening && (s?.notifyMeals ?? false)) {
      payloads.push(REMINDERS.meals);
    }

    for (const payload of payloads) {
      for (const sub of user.pushSubscriptions) {
        const ok = await sendPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
        );
        if (ok) {
          sent++;
        } else {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
          pruned++;
        }
      }
    }
  }

  return NextResponse.json({ sent, pruned, users: users.length });
}
