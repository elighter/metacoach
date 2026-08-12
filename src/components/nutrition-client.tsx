"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2, Loader2, Utensils } from "lucide-react";
import { fmt } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Meal {
  id: string; mealType: string; name: string;
  totalKcal: number; proteinG: number; carbG: number; fatG: number; timeLabel: string;
}
interface Food {
  id: string; name: string; kcalPer100g: number;
  proteinPer100g: number; carbPer100g: number; fatPer100g: number;
}

const MEAL_TYPES = [
  { id: "breakfast", label: "Kahvaltı" },
  { id: "lunch", label: "Öğle" },
  { id: "dinner", label: "Akşam" },
  { id: "snack", label: "Atıştırma" },
];
const mealLabel = Object.fromEntries(MEAL_TYPES.map((m) => [m.id, m.label]));

function defaultMealType(): string {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export function NutritionClient({ initialMeals }: { initialMeals: Meal[] }) {
  const router = useRouter();
  const [meals, setMeals] = useState<Meal[]>(initialMeals);
  const [q, setQ] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [mealType, setMealType] = useState(defaultMealType());
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch(`/api/foods?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setFoods(data.foods);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const factor = grams / 100;
  const computed = selected
    ? {
        kcal: Math.round(selected.kcalPer100g * factor),
        protein: Math.round(selected.proteinPer100g * factor),
        carb: Math.round(selected.carbPer100g * factor),
        fat: Math.round(selected.fatPer100g * factor),
      }
    : null;

  async function addMeal() {
    if (!selected || !computed) return;
    setBusy(true);
    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mealType,
        name: `${selected.name} (${grams} g)`,
        totalKcal: computed.kcal,
        proteinG: computed.protein,
        carbG: computed.carb,
        fatG: computed.fat,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setMeals((m) => [
        ...m,
        { id: data.meal.id, mealType, name: data.meal.name, totalKcal: computed.kcal, proteinG: computed.protein, carbG: computed.carb, fatG: computed.fat, timeLabel: "şimdi" },
      ]);
      setSelected(null);
      setGrams(100);
      setQ("");
      router.refresh();
    }
  }

  async function del(id: string) {
    setMeals((m) => m.filter((x) => x.id !== id));
    await fetch(`/api/meals/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const grouped = MEAL_TYPES.map((t) => ({ ...t, items: meals.filter((m) => m.mealType === t.id) }));

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* Today's meals */}
      <div className="flex flex-col gap-4">
        {grouped.map((g) => (
          <div key={g.id} className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold"><Utensils className="h-4 w-4 text-ink-3" /> {g.label}</div>
              <span className="text-xs tabular-nums text-ink-3">{fmt(g.items.reduce((s, m) => s + m.totalKcal, 0))} kcal</span>
            </div>
            {g.items.length === 0 ? (
              <p className="text-sm text-ink-3">Kayıt yok.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {g.items.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{m.name}</div>
                      <div className="font-mono text-xs text-ink-3">
                        P {fmt(m.proteinG)} · K {fmt(m.carbG)} · Y {fmt(m.fatG)} g
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">{fmt(m.totalKcal)}</span>
                      <button onClick={() => del(m.id)} className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-crit-wash hover:text-crit" aria-label="Sil">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add panel */}
      <div className="card h-fit p-4 lg:sticky lg:top-20">
        <div className="mb-3 font-semibold">Öğün ekle</div>
        <div className="mb-3 flex flex-wrap gap-1">
          {MEAL_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setMealType(t.id)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium",
                mealType === t.id ? "bg-primary-wash text-primary-ink" : "bg-surface-2 text-ink-3 hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-3" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setSelected(null); }} placeholder="Besin ara (ör. yulaf, tavuk)…" className="input pl-9" />
        </div>

        {!selected && (
          <div className="mt-2 flex max-h-64 flex-col overflow-y-auto">
            {foods.map((f) => (
              <button key={f.id} onClick={() => setSelected(f)} className="flex items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2">
                <span className="truncate">{f.name}</span>
                <span className="ml-2 shrink-0 font-mono text-xs text-ink-3">{fmt(f.kcalPer100g)} kcal/100g</span>
              </button>
            ))}
            {foods.length === 0 && <p className="px-2 py-3 text-sm text-ink-3">Sonuç yok.</p>}
          </div>
        )}

        {selected && computed && (
          <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3">
            <div className="text-sm font-medium">{selected.name}</div>
            <label className="mt-2 block">
              <span className="label">Miktar (gram)</span>
              <input type="number" min={1} value={grams} onChange={(e) => setGrams(Math.max(1, Number(e.target.value)))} className="input" />
            </label>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[["kcal", computed.kcal], ["P", computed.protein], ["K", computed.carb], ["Y", computed.fat]].map(([l, v]) => (
                <div key={l as string} className="rounded-lg bg-surface p-2">
                  <div className="text-[0.65rem] text-ink-3">{l}</div>
                  <div className="text-sm font-semibold tabular-nums">{fmt(v as number)}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button className="btn flex-1" onClick={() => setSelected(null)}>Vazgeç</button>
              <button className="btn btn-primary flex-1" onClick={addMeal} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ekle
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
