"use client";

import {
  TrendingDown,
  TrendingUp,
  Flame,
  Scale as ScaleIcon,
  Droplet,
  Activity,
  Footprints,
  Heart,
  Sparkles,
  Beef,
  Wheat,
  Nut,
  Dumbbell,
} from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-data";
import { Sparkline, WeightEnergyChart, CalorieBalanceChart, Ring } from "@/components/charts";
import { fmt, fmtDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

function Kpi({
  icon: Icon,
  tint,
  label,
  value,
  unit,
  delta,
  spark,
}: {
  icon: any;
  tint: string;
  label: string;
  value: string;
  unit?: string;
  delta?: { text: string; dir: "up" | "down" | "flat" };
  spark?: React.ReactNode;
}) {
  const dirColor =
    delta?.dir === "down" ? "text-good" : delta?.dir === "up" ? "text-good" : "text-ink-3";
  const DirIcon = delta?.dir === "up" ? TrendingUp : TrendingDown;
  return (
    <div className="card relative h-full overflow-hidden p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-ink-3">
        <span className="grid h-[22px] w-[22px] place-items-center rounded-[7px]" style={{ background: tint }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-ink-3">{unit}</span>}
      </div>
      {delta && (
        <div className={cn("mt-1.5 inline-flex items-center gap-1 text-xs font-semibold", dirColor)}>
          {delta.dir !== "flat" && <DirIcon className="h-3 w-3" />}
          {delta.text}
        </div>
      )}
      {spark && <div className="absolute bottom-3 right-3">{spark}</div>}
    </div>
  );
}

function Panel({
  title,
  sub,
  right,
  children,
  className,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card h-full p-4", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[0.95rem] font-semibold">{title}</div>
          {sub && <div className="text-xs text-ink-3">{sub}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

const flagPill: Record<string, string> = {
  normal: "bg-good-wash text-good",
  high: "bg-crit-wash text-crit",
  low: "bg-warn-wash text-warn",
};
const flagText: Record<string, string> = { normal: "Normal", high: "Yüksek", low: "Düşük" };

export function DashboardWidget({ id, data }: { id: string; data: DashboardData }) {
  const { tdee, mifflin, latestBio, chart, consumed, target, macroTarget, lab, weightDelta, windowDays, goal } = data;

  const trendSeries = chart.map((c) => c.trend).filter((v): v is number => v != null);
  const calSeries = chart.map((c) => c.calories).filter((v): v is number => v != null).slice(-8);
  const bfSeries = data.biometrics.map((b) => b.bodyFatPct).filter((v): v is number => v != null);
  const bfDelta =
    bfSeries.length >= 2 ? Number((bfSeries[bfSeries.length - 1] - bfSeries[0]).toFixed(1)) : null;

  switch (id) {
    case "tdee":
      return (
        <Kpi
          icon={Activity}
          tint="var(--primary-wash)"
          label="Dynamic TDEE"
          value={fmt(tdee.tdee)}
          unit="kcal"
          delta={
            mifflin
              ? { text: `Mifflin'den ${tdee.tdee >= mifflin ? "+" : ""}${fmt(tdee.tdee - mifflin)}`, dir: "up" }
              : undefined
          }
          spark={<Sparkline data={data.estimates.length >= 2 ? data.estimates.map((e) => e.tdeeKcal) : [tdee.prior, tdee.tdee]} />}
        />
      );
    case "weight":
      return (
        <Kpi
          icon={ScaleIcon}
          tint="var(--accent-wash)"
          label="Ağırlık trendi"
          value={fmt(tdee.trendWeightKg, 1)}
          unit="kg"
          delta={weightDelta != null ? { text: `${weightDelta > 0 ? "+" : ""}${fmt(weightDelta, 1)} kg / ${windowDays} gün`, dir: weightDelta <= 0 ? "down" : "up" } : undefined}
          spark={<Sparkline data={trendSeries.slice(-10)} color="var(--accent)" />}
        />
      );
    case "bodyfat":
      return (
        <Kpi
          icon={Droplet}
          tint="var(--good-wash)"
          label="Vücut yağı"
          value={fmt(latestBio?.bodyFatPct ?? null, 1)}
          unit="%"
          delta={bfDelta != null ? { text: `${bfDelta > 0 ? "+" : ""}${fmt(bfDelta, 1)} puan`, dir: bfDelta <= 0 ? "down" : "up" } : undefined}
          spark={<Sparkline data={bfSeries.slice(-10)} color="var(--good)" />}
        />
      );
    case "caloriesToday":
      return (
        <Kpi
          icon={Flame}
          tint="var(--warn-wash)"
          label="Bugün alınan"
          value={fmt(consumed.kcal)}
          unit={`/ ${fmt(target)}`}
          delta={{ text: `${fmt(Math.max(0, target - consumed.kcal))} kcal kaldı`, dir: "flat" }}
          spark={<Sparkline data={calSeries} color="var(--warn)" bars />}
        />
      );
    case "activity": {
      const a = data.activity;
      const rw = data.recentWorkouts[0];
      return (
        <Panel
          title="Aktivite"
          sub="Apple Health · aktif kalori & adım"
          right={
            a.connected ? (
              <span className="pill bg-good-wash text-good">Bağlı</span>
            ) : (
              <span className="pill bg-surface-2 text-ink-3">Bağlı değil</span>
            )
          }
        >
          {a.hasData ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-surface-2 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-ink-3"><Flame className="h-3.5 w-3.5" /> Aktif kalori</div>
                  <div className="mt-1 text-xl font-bold tabular-nums">{fmt(a.todayActiveKcal)}<span className="ml-1 text-xs font-medium text-ink-3">kcal</span></div>
                  <div className="mt-0.5 text-[0.7rem] text-ink-3">7g ort. {fmt(a.avgActiveKcal)} kcal</div>
                </div>
                <div className="rounded-lg border border-border bg-surface-2 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-ink-3"><Footprints className="h-3.5 w-3.5" /> Adım</div>
                  <div className="mt-1 text-xl font-bold tabular-nums">{fmt(a.todaySteps)}</div>
                  <div className="mt-0.5 text-[0.7rem] text-ink-3">7g ort. {fmt(a.avgSteps)}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {rw ? (
                    <div className="truncate text-xs text-ink-2">
                      <Heart className="mr-1 inline h-3 w-3 text-primary-ink" />
                      Son: <b className="text-ink">{rw.label}</b>
                      {rw.durationMin ? ` · ${rw.durationMin} dk` : ""}{rw.estKcal ? ` · ${fmt(rw.estKcal)} kcal` : ""}
                    </div>
                  ) : (
                    <div className="text-xs text-ink-3">Henüz antrenman yok</div>
                  )}
                  {a.autoCalibrated && (
                    <div className="mt-1 text-[0.7rem] text-ink-3">Aktivite düzeyi otomatik kalibre ediliyor</div>
                  )}
                </div>
                <Sparkline data={a.series} color="var(--good)" bars />
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-ink-3">Apple Health verisi henüz yok.</p>
              <a href="/settings" className="mt-1 inline-block text-xs font-semibold text-primary-ink">Aktivite senkronunu kur →</a>
            </div>
          )}
        </Panel>
      );
    }
    case "weeklyBalance": {
      const week = chart.slice(-7).map((c) => ({ label: c.label, intake: c.calories, burned: c.burned }));
      // Ortalama denge: hem alınan hem yakılan verisi olan günlerden.
      const bothDays = week.filter((d) => d.intake != null && d.burned != null) as { intake: number; burned: number }[];
      const avgBalance = bothDays.length
        ? Math.round(bothDays.reduce((s, d) => s + (d.intake - d.burned), 0) / bothDays.length)
        : null;
      return (
        <Panel
          title="Haftalık kalori dengesi"
          sub="Alınan (bar) · toplam harcama (çizgi, bazal+aktif)"
          right={
            avgBalance != null ? (
              <span className={cn("pill", avgBalance <= 0 ? "bg-good-wash text-good" : "bg-warn-wash text-warn")}>
                {avgBalance <= 0 ? "" : "+"}{fmt(avgBalance)} kcal/gün ort.
              </span>
            ) : null
          }
        >
          {week.length >= 2 ? (
            <CalorieBalanceChart data={week} />
          ) : (
            <p className="py-8 text-center text-sm text-ink-3">Trend için en az 2 günlük kayıt gerekli.</p>
          )}
        </Panel>
      );
    }
    case "weightEnergyChart":
      return (
        <Panel
          title="Ağırlık & Enerji Dengesi"
          sub="Trend ağırlığı (EWMA) · günlük kalori alımı"
          right={
            <div className="flex items-center gap-3 text-xs text-ink-2">
              <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-4 rounded bg-primary" />kg</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2.5 rounded-sm bg-accent/50" />kcal</span>
            </div>
          }
        >
          <WeightEnergyChart data={chart} />
        </Panel>
      );
    case "energyRing":
      return (
        <Panel title="Bugünün enerjisi">
          <div className="flex items-center gap-4">
            <Ring value={consumed.kcal} max={target} />
            <div className="text-sm">
              <div className="text-xs text-ink-3">Alınan</div>
              <div className="text-lg font-bold tabular-nums">{fmt(consumed.kcal)}<span className="text-xs font-medium text-ink-3"> kcal</span></div>
              <div className="mt-2 text-xs text-ink-3">Toplam harcama</div>
              <div className="text-lg font-bold tabular-nums">{fmt(tdee.tdee)}<span className="text-xs font-medium text-ink-3"> kcal</span></div>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            <MacroBar icon={Beef} label="Protein" value={consumed.protein} target={macroTarget.protein} color="var(--primary)" />
            <MacroBar icon={Wheat} label="Karbonhidrat" value={consumed.carb} target={macroTarget.carb} color="var(--accent)" />
            <MacroBar icon={Nut} label="Yağ" value={consumed.fat} target={macroTarget.fat} color="var(--warn)" />
          </div>
        </Panel>
      );
    case "bodyComposition":
      return (
        <Panel
          title="Vücut kompozisyonu"
          sub={latestBio ? `Mi Scale 2 · ${fmtDate(latestBio.measuredAt)}` : "Ölçüm yok"}
          right={<span className="pill bg-primary-wash text-primary-ink">Mi Scale 2</span>}
        >
          {latestBio ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Metric label="Kas kütlesi" value={fmt(latestBio.skeletalMuscleKg, 1)} unit="kg" />
              <Metric label="Vücut suyu" value={fmt(latestBio.bodyWaterPct, 1)} unit="%" />
              <Metric label="Viseral yağ" value={fmt(latestBio.visceralFat)} unit="" />
              <Metric label="BMR" value={fmt(latestBio.bmrDevice)} unit="kcal" />
              <Metric label="İmpedans" value={fmt(latestBio.impedance)} unit="Ω" />
              <Metric label="Ağırlık" value={fmt(latestBio.weightKg, 1)} unit="kg" />
            </div>
          ) : (
            <p className="text-sm text-ink-3">Henüz Mi Scale ölçümü yok.</p>
          )}
        </Panel>
      );
    case "biomarkers":
      return (
        <Panel
          title="Son kan tahlili"
          sub={lab ? `${fmtDate(lab.collectedAt ?? lab.createdAt)} · AI ile okundu · %${Math.round((lab.parseConfidence ?? 0.95) * 100)} güven` : "Tahlil yok"}
        >
          {lab && lab.biomarkers.length ? (
            <div className="flex flex-col">
              {[...lab.biomarkers]
                .sort((a, b) => (a.flag === "normal" ? 1 : 0) - (b.flag === "normal" ? 1 : 0))
                .slice(0, 5)
                .map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0">
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm tabular-nums">{fmt(m.value, m.value < 10 ? 1 : 0)} <span className="text-ink-3">{m.unit}</span></span>
                      <span className={cn("pill", flagPill[m.flag])}>{flagText[m.flag]}</span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-ink-3">Henüz tahlil yüklenmedi.</p>
          )}
        </Panel>
      );
    case "adaptiveInsight":
      return (
        <Panel title="Adaptif öneri" right={<Sparkles className="h-4 w-4 text-primary-ink" />}>
          <p className="text-sm text-ink-2">
            Hedefin <b className="text-ink">{goal === "cut" ? "yağ kaybı" : goal === "bulk" ? "kas kazanımı" : "koruma"}</b>. Öğrenilen TDEE'n{" "}
            <b className="text-ink">{fmt(tdee.tdee)} kcal</b> (±{fmt(tdee.tdee - tdee.ciLow)}), güven aralığı{" "}
            {fmt(tdee.ciLow)}–{fmt(tdee.ciHigh)}. Bu doğrultuda günlük hedefin{" "}
            <b className="text-primary-ink">{fmt(target)} kcal</b> ve ~<b className="text-ink">{macroTarget.protein} g protein</b>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="pill bg-surface-2 text-ink-2">Veri kalitesi %{Math.round(tdee.dataQuality * 100)}</span>
            <span className="pill bg-surface-2 text-ink-2">ρ = {fmt(tdee.rhoUsed)} kcal/kg</span>
            <span className="pill bg-surface-2 text-ink-2">{tdee.nDaysWithCalories} gün kayıt</span>
            <span className="pill bg-surface-2 text-ink-2">trend {fmt(tdee.weightSlopeKgPerWeek, 2)} kg/hafta</span>
            {data.activity.hasData && (
              <span className="pill bg-primary-wash text-primary-ink" title="Apple Health aktivitesinden otomatik ayarlandı">
                aktivite: {data.user.activityBase} · Apple Health
              </span>
            )}
          </div>
        </Panel>
      );
    case "nextWorkout": {
      const w = data.workout;
      return (
        <Panel title="Antrenman" right={<Dumbbell className="h-4 w-4 text-primary-ink" />}>
          {w.hasSession ? (
            <a href="/workout" className="block">
              <div className="text-lg font-bold tracking-tight">{w.label}</div>
              <div className="mt-0.5 text-xs text-ink-3">
                {w.scheduledFor ? fmtDate(w.scheduledFor, { weekday: "long", day: "numeric", month: "short" }) : ""} · {w.exerciseCount} hareket
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-ink">
                Seansı aç →
              </div>
            </a>
          ) : (
            <a href="/workout" className="block">
              <div className="text-sm text-ink-2">Henüz program yok.</div>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-ink">
                Program oluştur →
              </div>
            </a>
          )}
          <div className="mt-3 border-t border-border/60 pt-2.5 text-xs text-ink-3">
            Bu hafta <b className="text-ink">{w.completedThisWeek}</b> seans tamamlandı
          </div>
        </Panel>
      );
    }
    default:
      return null;
  }
}

function MacroBar({ icon: Icon, label, value, target, color }: { icon: any; label: string; value: number; target: number; color: string }) {
  const pct = Math.min(100, target > 0 ? (value / target) * 100 : 0);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium"><Icon className="h-3.5 w-3.5 text-ink-3" />{label}</span>
        <span className="tabular-nums text-ink-3">{fmt(value)} / {fmt(target)} g</span>
      </div>
      <div className="h-[7px] overflow-hidden rounded bg-surface-3">
        <div className="h-full rounded" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-2.5">
      <div className="text-[0.7rem] text-ink-3">{label}</div>
      <div className="mt-0.5 text-base font-semibold tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-xs font-normal text-ink-3">{unit}</span>}
      </div>
    </div>
  );
}
