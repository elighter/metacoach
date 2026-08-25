"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2, Loader2, Utensils, Camera, Image as ImageIcon, CheckCircle2, X, Sparkles } from "lucide-react";
import { fmt } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ParsedItem {
  name: string;
  portionG: number;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  confidence: number;
  selected: boolean;
}

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

  // Photo parse state — kamera (capture) ve galeri için ayrı girişler;
  // tek input'ta capture="environment" mobilde galeriyi engelliyordu.
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoParsing, setPhotoParsing] = useState(false);
  const [photoItems, setPhotoItems] = useState<ParsedItem[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoProvider, setPhotoProvider] = useState<string | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);

  async function handlePhoto(file: File) {
    setPhotoError(null);
    setPhotoItems([]);
    setPhotoProvider(null);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoParsing(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/meals/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse hatası");
      setPhotoProvider(data.provider);
      setPhotoItems(
        (data.items || []).map((it: ParsedItem) => ({ ...it, selected: true })),
      );
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Beklenmeyen hata");
    } finally {
      setPhotoParsing(false);
    }
  }

  async function savePhotoItems() {
    const toSave = photoItems.filter((it) => it.selected);
    if (toSave.length === 0) return;
    setPhotoSaving(true);
    for (const it of toSave) {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType,
          name: `${it.name} (~${it.portionG} g)`,
          totalKcal: it.kcal,
          proteinG: it.proteinG,
          carbG: it.carbG,
          fatG: it.fatG,
          source: "photo",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMeals((m) => [
          ...m,
          { id: data.meal.id, mealType, name: `${it.name} (~${it.portionG} g)`, totalKcal: it.kcal, proteinG: it.proteinG, carbG: it.carbG, fatG: it.fatG, timeLabel: "şimdi" },
        ]);
      }
    }
    setPhotoSaving(false);
    setPhotoItems([]);
    setPhotoPreview(null);
    setPhotoProvider(null);
    router.refresh();
  }

  function resetPhoto() {
    setPhotoPreview(null);
    setPhotoItems([]);
    setPhotoError(null);
    setPhotoProvider(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

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

        {/* Photo upload — kamera: capture ile; galeri: capture olmadan */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handlePhoto(f);
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handlePhoto(f);
          }}
        />

        {!photoPreview && photoItems.length === 0 && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-strong bg-surface-2 px-3 py-4 text-sm font-medium text-ink-2 transition-colors hover:border-primary hover:text-primary-ink"
            >
              <Camera className="h-5 w-5" />
              Fotoğraf çek
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-strong bg-surface-2 px-3 py-4 text-sm font-medium text-ink-2 transition-colors hover:border-primary hover:text-primary-ink"
            >
              <ImageIcon className="h-5 w-5" />
              Galeriden yükle
            </button>
          </div>
        )}

        {photoPreview && (
          <div className="mt-2 space-y-3">
            <div className="relative">
              <img src={photoPreview} alt="Tabak" className="w-full rounded-xl object-cover" style={{ maxHeight: 200 }} />
              <button
                onClick={resetPhoto}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="Kaldır"
              >
                <X className="h-4 w-4" />
              </button>
              {photoProvider && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-xs font-medium text-white">
                  <Sparkles className="h-3 w-3" />
                  {photoProvider === "claude" ? "Claude Vision" : "Mock"}
                </span>
              )}
            </div>

            {photoParsing && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-ink-3">
                <Loader2 className="h-4 w-4 animate-spin" /> AI yiyecekleri tanıyor…
              </div>
            )}

            {photoError && (
              <div className="rounded-xl border border-crit/30 bg-crit-wash px-3 py-2 text-sm text-crit">
                {photoError}
              </div>
            )}

            {photoItems.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-ink-3">Tanınan yiyecekler — eklemek istemediklerini kaldır:</div>
                {photoItems.map((it, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2.5 transition-colors",
                      it.selected ? "border-primary/40 bg-primary-wash/40" : "border-border bg-surface-2 opacity-50",
                    )}
                  >
                    <button
                      onClick={() => setPhotoItems((prev) => prev.map((p, j) => j === i ? { ...p, selected: !p.selected } : p))}
                      className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md", it.selected ? "bg-primary text-white" : "bg-surface-2 text-ink-3")}
                    >
                      {it.selected ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{it.name}</div>
                      <div className="font-mono text-[0.65rem] text-ink-3">
                        ~{it.portionG}g · {fmt(it.kcal)} kcal · P{fmt(it.proteinG)} K{fmt(it.carbG)} Y{fmt(it.fatG)}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-ink-3">%{Math.round(it.confidence * 100)}</span>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button className="btn flex-1" onClick={resetPhoto}>Vazgeç</button>
                  <button
                    className="btn btn-primary flex-1"
                    onClick={savePhotoItems}
                    disabled={photoSaving || photoItems.filter((it) => it.selected).length === 0}
                  >
                    {photoSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {photoItems.filter((it) => it.selected).length} öğe ekle
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 text-xs text-ink-3">
          <div className="h-px flex-1 bg-border" />
          veya manuel ara
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Manual search */}
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
            {foods.length === 0 && q.length > 0 && <p className="px-2 py-3 text-sm text-ink-3">Sonuç yok.</p>}
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
