import { getCurrentUser, prisma } from "@/lib/db";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const [settings, devices, consents] = await Promise.all([
    prisma.settings.findUnique({ where: { userId: user.id } }),
    prisma.deviceConnection.findMany({ where: { userId: user.id } }),
    prisma.consent.findMany({ where: { userId: user.id, revokedAt: null } }),
  ]);

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
        />
      </div>
    </div>
  );
}
