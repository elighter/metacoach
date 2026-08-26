import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, prisma } from "@/lib/db";
import { getCoachAccess, canSee, COACH_MODULES } from "@/lib/coach";
import { getDashboardData } from "@/lib/dashboard-data";
import { CoachPlanEditor } from "@/components/coach-plan-editor";
import { CoachProgramBuilder } from "@/components/coach-program-builder";
import { CoachComments } from "@/components/coach-comments";
import { fmt, fmtDate } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

const MODULE_LABEL = Object.fromEntries(COACH_MODULES.map((m) => [m.id, m.label]));

export default async function CoachClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const coach = await getCurrentUser();
  const access = await getCoachAccess(coach.id, clientId);
  if (!access) notFound();

  const { permissions, client } = access;
  const anyData = (["activity", "workout", "nutrition", "biometrics", "metabolism"] as const).some((m) => canSee(permissions, m));

  const [data, assessment, plan, comments] = await Promise.all([
    anyData ? getDashboardData(clientId) : Promise.resolve(null),
    canSee(permissions, "assessment")
      ? prisma.coachAssessment.findUnique({ where: { userId: clientId } })
      : Promise.resolve(null),
    prisma.trainingPlan.findFirst({ where: { clientId, active: true }, orderBy: { createdAt: "desc" } }),
    prisma.coachComment.findMany({ where: { clientId }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/coach" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> Danışanlar
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">{client.name}</h1>
      <p className="mt-1 text-sm text-ink-3">
        Paylaşılan modüller: {permissions.length ? permissions.map((p) => MODULE_LABEL[p]).join(" · ") : "yok (danışan henüz açmadı)"}
      </p>

      <div className="mt-5 flex flex-col gap-5">
        {/* İzinli modül özetleri (salt-okunur) */}
        {data && (
          <div className="grid gap-3 sm:grid-cols-2">
            {canSee(permissions, "metabolism") && (
              <SummaryCard title="Metabolizma (TDEE)">
                <Big value={fmt(data.tdee.tdee)} unit="kcal" />
                <Muted>{data.tdee.ciLow}–{data.tdee.ciHigh} · veri %{Math.round(data.tdee.dataQuality * 100)}</Muted>
              </SummaryCard>
            )}
            {canSee(permissions, "activity") && (
              <SummaryCard title="Aktivite (7g ort.)">
                <Big value={fmt(data.activity.avgActiveKcal)} unit="kcal" />
                <Muted>{fmt(data.activity.avgSteps)} adım/gün · düzey {data.user.activityBase}</Muted>
              </SummaryCard>
            )}
            {canSee(permissions, "nutrition") && (
              <SummaryCard title="Beslenme (bugün)">
                <Big value={fmt(data.consumed.kcal)} unit={`/ ${fmt(data.target)}`} />
                <Muted>{fmt(data.consumed.protein)} g protein alındı</Muted>
              </SummaryCard>
            )}
            {canSee(permissions, "biometrics") && (
              <SummaryCard title="Biyometri">
                <Big value={fmt(data.latestBio?.weightKg ?? null, 1)} unit="kg" />
                <Muted>{data.latestBio?.bodyFatPct != null ? `%${fmt(data.latestBio.bodyFatPct, 1)} yağ` : "ölçüm yok"}</Muted>
              </SummaryCard>
            )}
            {canSee(permissions, "workout") && (
              <SummaryCard title="Antrenman (bu hafta)">
                <Big value={String(data.workout.completedThisWeek)} unit="seans" />
                <Muted>{data.recentWorkouts[0] ? `son: ${data.recentWorkouts[0].label}` : "kayıt yok"}</Muted>
              </SummaryCard>
            )}
          </div>
        )}

        {canSee(permissions, "assessment") && assessment && (
          <div className="card p-5">
            <div className="kicker mb-3">Ön değerlendirme</div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div><span className="text-ink-3">Uyanış/Uyku:</span> {assessment.wakeTime ?? "—"} / {assessment.sleepTime ?? "—"}</div>
              <div><span className="text-ink-3">Hareket:</span> {assessment.activityLevel ?? "—"}</div>
              <div className="sm:col-span-2"><span className="text-ink-3">Yemek notu:</span> {assessment.dietRecall ? assessment.dietRecall.slice(0, 200) : "—"}</div>
            </div>
          </div>
        )}

        {/* Haftalık program builder */}
        <div className="card p-5">
          <div className="kicker mb-3">Haftalık program oluştur</div>
          <CoachProgramBuilder clientId={clientId} />
        </div>

        {/* Serbest plan / notlar */}
        <div className="card p-5">
          <div className="kicker mb-3">Genel plan & notlar</div>
          <CoachPlanEditor clientId={clientId} current={plan ? { title: plan.title, body: plan.body } : null} />
        </div>

        {/* Mesajlaşma */}
        <div className="card p-5">
          <div className="kicker mb-3">Danışanla mesajlaşma</div>
          <CoachComments
            clientId={clientId}
            viewerRole="coach"
            comments={comments.map((c) => ({ id: c.id, authorRole: c.authorRole, body: c.body, createdAt: c.createdAt.toISOString() }))}
          />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-ink-3">{title}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
function Big({ value, unit }: { value: string; unit?: string }) {
  return (
    <div className="text-2xl font-bold tabular-nums">
      {value}
      {unit && <span className="ml-1 text-sm font-medium text-ink-3">{unit}</span>}
    </div>
  );
}
function Muted({ children }: { children: React.ReactNode }) {
  return <div className="mt-0.5 text-xs text-ink-3">{children}</div>;
}
