import { getCurrentUser, prisma } from "@/lib/db";
import { getDashboardData } from "@/lib/dashboard-data";
import { NutritionClient } from "@/components/nutrition-client";
import { startOfDay, fmt } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NutritionPage() {
  const user = await getCurrentUser();
  const [meals, data] = await Promise.all([
    prisma.meal.findMany({
      where: { userId: user.id, loggedAt: { gte: startOfDay(new Date()) } },
      orderBy: { loggedAt: "asc" },
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
