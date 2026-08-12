import { getCurrentUser, prisma } from "@/lib/db";
import { MiScalePanel } from "@/components/mi-scale-panel";
import { fmt, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const sourceLabel: Record<string, string> = {
  mi_scale: "Mi Scale 2",
  inbody: "InBody",
  manual: "Manuel",
  wearable: "Giyilebilir",
};

export default async function BiometricsPage() {
  const user = await getCurrentUser();
  const [bios, conn] = await Promise.all([
    prisma.biometric.findMany({ where: { userId: user.id }, orderBy: { measuredAt: "desc" }, take: 24 }),
    prisma.deviceConnection.findFirst({ where: { userId: user.id, provider: "mi_scale" } }),
  ]);
  const latestWeight = bios[0]?.weightKg ?? 80;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight">Biyometri</h1>
      <p className="mt-1 text-sm text-ink-3">Akıllı tartı ve InBody ölçümlerin — ağırlık ve vücut kompozisyonu geçmişi.</p>

      <div className="mt-5">
        <MiScalePanel
          latestWeight={latestWeight}
          connected={conn?.status === "connected"}
          lastSyncAt={conn?.lastSyncAt ? conn.lastSyncAt.toISOString() : null}
        />
      </div>

      <div className="card mt-5 p-4">
        <div className="mb-2 text-[0.95rem] font-semibold">Ölçüm geçmişi</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[0.66rem] uppercase tracking-wider text-ink-3">
                <th className="py-2">Tarih</th><th>Kaynak</th><th className="text-right">Ağırlık</th>
                <th className="text-right">Yağ %</th><th className="text-right">Kas</th>
                <th className="text-right">Su %</th><th className="text-right">Viseral</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {bios.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="py-2.5">{fmtDate(b.measuredAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td><span className="pill bg-surface-2 text-ink-2">{sourceLabel[b.source] ?? b.source}</span></td>
                  <td className="text-right font-medium">{fmt(b.weightKg, 1)} kg</td>
                  <td className="text-right">{fmt(b.bodyFatPct, 1)}</td>
                  <td className="text-right">{fmt(b.skeletalMuscleKg, 1)} kg</td>
                  <td className="text-right">{fmt(b.bodyWaterPct, 1)}</td>
                  <td className="text-right">{fmt(b.visceralFat)}</td>
                </tr>
              ))}
              {bios.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-ink-3">Henüz ölçüm yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
