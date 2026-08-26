import { getCurrentUser, prisma } from "@/lib/db";
import { SettingsForm } from "@/components/settings-form";
import { CoachAccessCard } from "@/components/coach-access-card";
import { getClientCoachInfo, COACH_MODULES } from "@/lib/coach";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const [settings, devices, consents, healthToken, coachInfo] = await Promise.all([
    prisma.settings.findUnique({ where: { userId: user.id } }),
    prisma.deviceConnection.findMany({ where: { userId: user.id } }),
    prisma.consent.findMany({ where: { userId: user.id, revokedAt: null } }),
    prisma.healthIngestToken.findUnique({ where: { userId: user.id } }),
    getClientCoachInfo(user.id),
  ]);
  const appleHealthSync = devices.find((d) => d.provider === "apple_health");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Ayarlar</h1>
      <p className="mt-1 text-sm text-ink-3">Görünüm, bildirimler, metabolizma penceresi, cihazlar ve veri gizliliği.</p>

      <div className="mt-5">
        <SettingsForm
          initial={{
            notifyWeighIn: settings?.notifyWeighIn ?? true,
            notifyMeals: settings?.notifyMeals ?? false,
            weeklyReport: settings?.weeklyReport ?? true,
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
