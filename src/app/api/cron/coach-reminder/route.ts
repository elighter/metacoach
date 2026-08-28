import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { daysAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ClientSummary {
  name: string;
  email: string;
  workoutsThisWeek: number;
  lastSyncAt: Date | null;
  hasProgram: boolean;
  activePlan: string | null;
  lastWeight: number | null;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coaches = await prisma.user.findMany({
    where: { role: "coach" },
    select: { id: true, name: true, email: true },
  });

  if (coaches.length === 0) {
    return NextResponse.json({ sent: 0, reason: "no coaches" });
  }

  const weekAgo = daysAgo(7);
  let sent = 0;

  for (const coach of coaches) {
    const links = await prisma.coachLink.findMany({
      where: { coachId: coach.id, status: "active" },
      include: {
        client: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (links.length === 0) continue;

    const summaries: ClientSummary[] = [];

    for (const link of links) {
      const clientId = link.client.id;

      const [workoutCount, program, plan, device, bio] = await Promise.all([
        prisma.workoutSession.count({
          where: { userId: clientId, status: "completed", completedAt: { gte: weekAgo } },
        }),
        prisma.workoutProgram.findFirst({
          where: { userId: clientId, active: true },
          select: { id: true },
        }),
        prisma.trainingPlan.findFirst({
          where: { clientId, active: true },
          orderBy: { createdAt: "desc" },
          select: { title: true },
        }),
        prisma.deviceConnection.findFirst({
          where: { userId: clientId, provider: "apple_health" },
          select: { lastSyncAt: true },
        }),
        prisma.biometric.findFirst({
          where: { userId: clientId },
          orderBy: { measuredAt: "desc" },
          select: { weightKg: true },
        }),
      ]);

      summaries.push({
        name: link.client.name,
        email: link.client.email,
        workoutsThisWeek: workoutCount,
        lastSyncAt: device?.lastSyncAt ?? null,
        hasProgram: !!program,
        activePlan: plan?.title ?? null,
        lastWeight: bio?.weightKg ?? null,
      });
    }

    const appUrl = process.env.APP_BASE_URL ?? "https://metacoach-three.vercel.app";
    const html = buildCoachEmail(coach.name, summaries, appUrl);

    const result = await sendEmail({
      to: coach.email,
      subject: `Haftalık Danışan Özeti — ${summaries.length} danışan`,
      html,
    });

    if (!result.error) sent++;
  }

  return NextResponse.json({ sent, coaches: coaches.length });
}

function buildCoachEmail(coachName: string, clients: ClientSummary[], appUrl: string): string {
  const rows = clients
    .map((c) => {
      const syncBadge = c.lastSyncAt
        ? `<span style="color:#22c55e">&#x2713; Senkron</span>`
        : `<span style="color:#ef4444">&#x2717; Bağlantı yok</span>`;
      const programBadge = c.hasProgram
        ? `<span style="color:#22c55e">&#x2713; Program var</span>`
        : `<span style="color:#f59e0b">&#x25CB; Program yok</span>`;
      const weightText = c.lastWeight ? `${c.lastWeight} kg` : "—";

      return `
        <tr>
          <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0">
            <strong>${esc(c.name)}</strong><br>
            <span style="font-size:13px;color:#666">${esc(c.email)}</span>
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:center">
            <strong>${c.workoutsThisWeek}</strong>
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px">
            ${weightText}
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px">
            ${syncBadge}
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px">
            ${programBadge}
          </td>
        </tr>`;
    })
    .join("");

  const needsProgram = clients.filter((c) => !c.hasProgram);
  const ctaSection =
    needsProgram.length > 0
      ? `
        <div style="margin:24px 0;padding:16px;background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b">
          <strong>${needsProgram.length} danışanın henüz antrenman programı yok.</strong>
          <p style="margin:8px 0 0;font-size:14px;color:#666">
            ${needsProgram.map((c) => esc(c.name)).join(", ")} için program oluşturmayı unutma.
          </p>
        </div>`
      : "";

  return `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)">

      <div style="text-align:center;margin-bottom:24px">
        <h1 style="margin:0;font-size:20px;color:#111">Haftalık Danışan Özeti</h1>
        <p style="margin:4px 0 0;font-size:14px;color:#888">Merhaba ${esc(coachName)}, işte bu haftanın durumu</p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="border-bottom:2px solid #e5e7eb">
            <th style="padding:8px;text-align:left;font-size:13px;color:#666">Danışan</th>
            <th style="padding:8px;text-align:center;font-size:13px;color:#666">Antrenman</th>
            <th style="padding:8px;text-align:center;font-size:13px;color:#666">Ağırlık</th>
            <th style="padding:8px;text-align:center;font-size:13px;color:#666">Senkron</th>
            <th style="padding:8px;text-align:center;font-size:13px;color:#666">Program</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      ${ctaSection}

      <div style="text-align:center;margin-top:24px">
        <a href="${appUrl}/coach" style="display:inline-block;padding:12px 32px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
          Paneli Aç
        </a>
      </div>
    </div>

    <p style="text-align:center;font-size:12px;color:#aaa;margin-top:16px">
      MetaCoach &middot; Koç hatırlatma e-postası
    </p>
  </div>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
