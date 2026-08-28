import { getCurrentUser, prisma } from "@/lib/db";
import { SettingsForm } from "@/components/settings-form";
import { CoachAccessCard } from "@/components/coach-access-card";
import { getClientCoachInfo, COACH_MODULES } from "@/lib/coach";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const [settings, devices, consents, healthToken, coachInfo, ingestLogs] = await Promise.all([
    prisma.settings.findUnique({ where: { userId: user.id } }),
    prisma.deviceConnection.findMany({ where: { userId: user.id } }),
    prisma.consent.findMany({ where: { userId: user.id, revokedAt: null } }),
    prisma.healthIngestToken.findUnique({ where: { userId: user.id } }),
    getClientCoachInfo(user.id),
    prisma.healthIngestLog.findMany({
      where: { userId: user.id },
      orderBy: { at: "desc" },
      take: 5,
    }),
  ]);
  const appleHealthSync = devices.find((d) => d.provider === "apple_health");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Ayarlar</h1>
      <p className="mt-1 text-sm text-ink-3">Görünüm, bildirimler, metabolizma penceresi, cihazlar ve veri gizliliği.</p>

      <div className="mt-5">
        <SettingsForm
          initial={{
            tdeeWindowDays: settings?.tdeeWindowDays ?? 21,
          }}
          devices={devices.map((d) => ({
            provider: d.provider,
            status: d.status,
            lastSyncAt: d.lastSyncAt ? d.lastSyncAt.toISOString() : null,
          }))}
          consents={consents.map((c) => ({
            type: c.type,
            version: c.version,
            grantedAt: c.grantedAt.toISOString(),
          }))}
          appleHealth={{
            token: healthToken?.token ?? null,
            lastSyncAt: appleHealthSync?.lastSyncAt ? appleHealthSync.lastSyncAt.toISOString() : null,
            logs: ingestLogs.map((l) => ({
              at: l.at.toISOString(),
              via: l.via,
              daysReceived: l.daysReceived,
              workoutsReceived: l.workoutsReceived,
              workoutsCreated: l.workoutsCreated,
              sessionsCompleted: l.sessionsCompleted,
            })),
          }}
        />

        <div className="mt-5">
          <CoachAccessCard
            linkedCoach={coachInfo.coach ? { name: coachInfo.coach.name, email: coachInfo.coach.email } : null}
            initialLinkPermissions={coachInfo.permissions}
            initialInvitePermissions={coachInfo.invitePermissions}
            initialInviteCode={coachInfo.inviteCode}
            modules={COACH_MODULES.map((m) => ({ id: m.id, label: m.label }))}
          />
        </div>
      </div>
    </div>
  );
}
