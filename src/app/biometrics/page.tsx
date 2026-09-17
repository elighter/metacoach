import { getCurrentUser, prisma } from "@/lib/db";
import { MiScalePanel } from "@/components/mi-scale-panel";
import { BiometricHistory } from "@/components/biometric-history";

export const dynamic = "force-dynamic";

export default async function BiometricsPage() {
  const user = await getCurrentUser();
  const [bios, conn] = await Promise.all([
    prisma.biometric.findMany({ where: { userId: user.id }, orderBy: { measuredAt: "desc" }, take: 24 }),
    prisma.deviceConnection.findFirst({ where: { userId: user.id, provider: "mi_scale" } }),
  ]);
  const latestWeight = bios[0]?.weightKg ?? 80;

  const bioData = bios.map((b) => ({
    id: b.id,
    measuredAt: b.measuredAt.toISOString(),
    source: b.source,
    weightKg: b.weightKg,
    bodyFatPct: b.bodyFatPct,
    skeletalMuscleKg: b.skeletalMuscleKg,
    bodyWaterPct: b.bodyWaterPct,
    visceralFat: b.visceralFat,
  }));

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

      <BiometricHistory bios={bioData} />
    </div>
  );
}
