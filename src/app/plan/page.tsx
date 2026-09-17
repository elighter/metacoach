import { getCurrentUser, prisma } from "@/lib/db";
import { getClientCoachInfo } from "@/lib/coach";
import { CoachComments } from "@/components/coach-comments";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const user = await getCurrentUser();
  const info = await getClientCoachInfo(user.id);

  const [plan, comments] = await Promise.all([
    prisma.trainingPlan.findFirst({
      where: { clientId: user.id, active: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coachComment.findMany({
      where: { clientId: user.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Planım</h1>
      <p className="mt-1 text-sm text-ink-3">
        {info.coach ? `Koçun: ${info.coach.name}` : "Henüz bir koça bağlı değilsin."}
      </p>

      {!info.coach ? (
        <div className="card mt-5 p-5 text-sm text-ink-3">
          Antrenörünle çalışmak için <b className="text-ink">Ayarlar → Koç erişimi</b>'nden bir davet kodu oluştur ve koçuna ver.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          <div className="card p-5">
            <div className="kicker mb-3">Antrenman planı</div>
            {plan ? (
              <>
                <div className="text-base font-semibold">{plan.title}</div>
                <div className="mb-3 text-xs text-ink-3">{fmtDate(plan.createdAt, { day: "numeric", month: "long", year: "numeric" })} · {info.coach.name}</div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{plan.body}</div>
              </>
            ) : (
              <p className="text-sm text-ink-3">Koçun henüz bir plan girmedi.</p>
            )}
          </div>

          <div className="card p-5">
            <div className="kicker mb-3">Koçunla mesajlaşma</div>
            <CoachComments
              clientId={user.id}
              viewerRole="client"
              comments={comments.map((c) => ({ id: c.id, authorRole: c.authorRole, body: c.body, createdAt: c.createdAt.toISOString() }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
