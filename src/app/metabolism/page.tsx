import { getCurrentUser } from "@/lib/db";
import { getDashboardData } from "@/lib/dashboard-data";
import { TdeeHistoryChart } from "@/components/charts";
import { RecomputeButton } from "@/components/recompute-button";
import { fmt } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MetabolismPage() {
  const user = await getCurrentUser();
  const data = await getDashboardData(user.id);
  const { tdee, mifflin, windowDays, target, goal, estimates } = data;

  const history = estimates.map((e) => ({
    label: e.computedAt.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
    tdee: e.tdeeKcal,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metabolizma</h1>
          <p className="mt-1 text-sm text-ink-3">Verinden öğrenilen gerçek enerji harcaması — statik formül değil.</p>
        </div>
        <RecomputeButton />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <div className="card flex flex-col justify-between p-6">
          <div className="kicker">Dynamic TDEE</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-5xl font-bold tracking-tight tabular-nums">{fmt(tdee.tdee)}</span>
            <span className="mb-1.5 text-lg text-ink-3">kcal/gün</span>
          </div>
          <div className="mt-1 text-sm text-ink-2">
            Güven aralığı <b className="tabular-nums">{fmt(tdee.ciLow)}–{fmt(tdee.ciHigh)}</b> kcal
          </div>
          {mifflin && (
            <div className="mt-4 flex items-center gap-4 border-t border-border pt-4 text-sm">
              <div>
                <div className="text-xs text-ink-3">Statik (Mifflin-St Jeor)</div>
                <div className="font-semibold tabular-nums">{fmt(mifflin)} kcal</div>
              </div>
              <div className="text-2xl text-ink-3">→</div>
              <div>
                <div className="text-xs text-ink-3">Fark (öğrenilen)</div>
                <div className="font-semibold tabular-nums text-primary-ink">
                  {tdee.tdee >= mifflin ? "+" : ""}{fmt(tdee.tdee - mifflin)} kcal
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-3 text-[0.95rem] font-semibold">Model girdileri</div>
          <dl className="flex flex-col gap-2.5 text-sm">
            <Row k="Yöntem" v="EWMA + enerji dengesi" />
            <Row k="Fizyolojik önsel" v={`${fmt(tdee.prior)} kcal (Katch-McArdle)`} />
            <Row k="Gözlemlenen" v={tdee.observed ? `${fmt(tdee.observed)} kcal` : "—"} />
            <Row k="Harman ağırlığı (w)" v={`${Math.round(tdee.weightObserved * 100)}%`} />
            <Row k="Veri kalitesi" v={`${Math.round(tdee.dataQuality * 100)}%`} />
            <Row k="Enerji yoğunluğu ρ" v={`${fmt(tdee.rhoUsed)} kcal/kg`} />
            <Row k="Pencere" v={`${windowDays} gün`} />
            <Row k="Ağırlık eğimi" v={`${fmt(tdee.weightSlopeKgPerWeek, 2)} kg/hafta`} />
          </dl>
        </div>
      </div>

      <div className="card mt-4 p-5">
        <div className="mb-1 text-[0.95rem] font-semibold">TDEE geçmişi</div>
        <div className="mb-2 text-xs text-ink-3">Zaman içinde metabolizma tahmini (haftalık yeniden hesaplama)</div>
        {history.length >= 2 ? (
          <TdeeHistoryChart data={history} />
        ) : (
          <p className="py-6 text-center text-sm text-ink-3">Grafik için en az iki tahmin gerekli. “Yeniden hesapla”ya bas.</p>
        )}
      </div>

      <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <div className="text-[0.95rem] font-semibold">Adaptif hedef</div>
          <p className="mt-1 text-sm text-ink-2">
            Hedefin <b className="text-ink">{goal === "cut" ? "yağ kaybı" : goal === "bulk" ? "kas kazanımı" : "koruma"}</b>.
            Öğrenilen TDEE'ne göre günlük hedef otomatik ayarlanır.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-3">Günlük kalori hedefi</div>
          <div className="text-2xl font-bold tabular-nums text-primary-ink">{fmt(target)} kcal</div>
        </div>
      </div>

      <p className="mt-6 rounded-xl border border-dashed border-border bg-surface-2 p-3 text-center text-xs text-ink-3">
        Üretimde bu hesaplama Python/FastAPI “Metabolism Engine” servisinde koşar ve Kalman filtresine yükseltilebilir.
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <dt className="text-ink-3">{k}</dt>
      <dd className="text-right font-medium tabular-nums">{v}</dd>
    </div>
  );
}
