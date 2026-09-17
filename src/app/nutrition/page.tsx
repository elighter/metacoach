import { getCurrentUser, prisma } from "@/lib/db";
import { getDashboardData } from "@/lib/dashboard-data";
import { NutritionClient } from "@/components/nutrition-client";
import { startOfDay, daysAgo, fmt, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MEAL_LABEL: Record<string, string> = {
  breakfast: "Kahvaltı",
  lunch: "Öğle",
  dinner: "Akşam",
  snack: "Atıştırma",
};

export default async function NutritionPage() {
  const user = await getCurrentUser();
  const today = startOfDay(new Date());
  const [meals, pastMeals, data] = await Promise.all([
    prisma.meal.findMany({
      where: { userId: user.id, loggedAt: { gte: today } },
      orderBy: { loggedAt: "asc" },
    }),
    // Son 14 günün (bugün hariç) öğünleri → gün gün geçmiş
    prisma.meal.findMany({
      where: { userId: user.id, loggedAt: { gte: daysAgo(14), lt: today } },
      orderBy: { loggedAt: "desc" },
    }),
    getDashboardData(user.id),
  ]);

  const initialMeals = meals.map((m) => ({
    id: m.id,
    mealType: m.mealType,
    name: m.name,
    totalKcal: m.totalKcal,
    proteinG: m.proteinG,
    carbG: m.carbG,
    fatG: m.fatG,
    timeLabel: m.loggedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
  }));

  const { consumed, target, macroTarget } = data;
  const remaining = Math.max(0, target - consumed.kcal);

  // Geçmiş öğünleri güne göre grupla (yeni → eski).
  const historyMap = new Map<string, { date: Date; meals: typeof pastMeals; kcal: number; protein: number }>();
  for (const m of pastMeals) {
    const key = startOfDay(m.loggedAt).toISOString();
    const g = historyMap.get(key) ?? { date: startOfDay(m.loggedAt), meals: [], kcal: 0, protein: 0 };
    g.meals.push(m);
    g.kcal += m.totalKcal;
    g.protein += m.proteinG;
    historyMap.set(key, g);
  }
  const history = [...historyMap.values()];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Beslenme</h1>
      <p className="mt-1 text-sm text-ink-3">Bugünün öğünleri ve makro dağılımı. Hedefler öğrenilen TDEE'ne göre ayarlanır.</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Alınan" value={fmt(consumed.kcal)} unit="kcal" tone="ink" />
        <Stat label="Hedef" value={fmt(target)} unit="kcal" tone="primary" />
        <Stat label="Kalan" value={fmt(remaining)} unit="kcal" tone="accent" />
        <Stat label="Protein" value={`${fmt(consumed.protein)}/${fmt(macroTarget.protein)}`} unit="g" tone="ink" />
      </div>

      <div className="mt-5">
        <NutritionClient initialMeals={initialMeals} />
      </div>

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight">Geçmiş günler</h2>
          <p className="mt-0.5 text-sm text-ink-3">Son 14 günün öğün kayıtları ve günlük kalori toplamı.</p>
          <div className="mt-3 flex flex-col gap-2.5">
            {history.map((d) => (
              <details key={d.date.toISOString()} className="card overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 hover:bg-surface-2">
                  <div>
                    <div className="text-sm font-semibold">
                      {fmtDate(d.date, { weekday: "long", day: "numeric", month: "long" })}
                    </div>
                    <div className="text-xs text-ink-3">{d.meals.length} öğün · {fmt(d.protein)} g protein</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold tabular-nums">{fmt(d.kcal)}<span className="ml-1 text-xs font-medium text-ink-3">kcal</span></div>
                    <div className="text-[0.7rem] text-ink-3">hedef {fmt(target)}</div>
                  </div>
                </summary>
                <div className="border-t border-border">
                  {d.meals.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-sm last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="pill bg-surface-2 text-ink-3">{MEAL_LABEL[m.mealType] ?? m.mealType}</span>
                        <span className="font-medium">{m.name}</span>
                      </div>
                      <span className="tabular-nums text-ink-2">{fmt(m.totalKcal)} kcal</span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, unit, tone }: { label: string; value: string; unit: string; tone: "ink" | "primary" | "accent" }) {
  const color = tone === "primary" ? "text-primary-ink" : tone === "accent" ? "text-accent" : "text-ink";
  return (
    <div className="card p-3.5">
      <div className="text-xs text-ink-3">{label}</div>
      <div className={`mt-0.5 text-xl font-bold tabular-nums ${color}`}>
        {value}<span className="ml-1 text-xs font-medium text-ink-3">{unit}</span>
      </div>
    </div>
  );
}
