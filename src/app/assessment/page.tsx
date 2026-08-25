import { getCurrentUser, prisma } from "@/lib/db";
import { EMPTY_ASSESSMENT, type AssessmentData } from "@/lib/assessment";
import { AssessmentClient } from "@/components/assessment-client";

export const dynamic = "force-dynamic";

export default async function AssessmentPage() {
  const user = await getCurrentUser();
  const a = await prisma.coachAssessment.findUnique({ where: { userId: user.id } });

  const initial: AssessmentData = a
    ? {
        dietRecall: a.dietRecall ?? "",
        wakeTime: a.wakeTime ?? "",
        sleepTime: a.sleepTime ?? "",
        activityLevel: a.activityLevel ?? user.activityBase ?? "",
        routineNote: a.routineNote ?? "",
        b12: a.b12 ?? "",
        vitaminD: a.vitaminD ?? "",
        fastingInsulin: a.fastingInsulin ?? "",
        homaIR: a.homaIR ?? "",
        tsh: a.tsh ?? "",
        labNote: a.labNote ?? "",
        status: a.status,
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
      }
    : { ...EMPTY_ASSESSMENT, activityLevel: user.activityBase ?? "" };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Ön Değerlendirme</h1>
      <p className="mt-1 text-sm text-ink-3">
        Antrenör/diyetisyen görüşmenizden önce bu kısa hazırlığı doldurun. Verdiğiniz cevaplar
        koçun size en doğru yaklaşımı seçmesini sağlar.
      </p>

      <AssessmentClient initial={initial} />
    </div>
  );
}
