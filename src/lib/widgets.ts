// Registry of dashboard widgets. The user can toggle visibility and reorder
// them (drag & drop); the layout persists to DashboardLayout.

export interface WidgetDef {
  id: string;
  title: string;
  description: string;
  colSpan: number; // columns on the 4-col desktop grid
}

export const WIDGETS: WidgetDef[] = [
  { id: "tdee", title: "Dynamic TDEE", description: "Öğrenilen metabolizma hızı", colSpan: 1 },
  { id: "weight", title: "Ağırlık trendi", description: "EWMA yumuşatılmış", colSpan: 1 },
  { id: "bodyfat", title: "Vücut yağı", description: "Son ölçüm", colSpan: 1 },
  { id: "caloriesToday", title: "Bugün alınan", description: "Kalori / hedef", colSpan: 1 },
  { id: "activity", title: "Aktivite", description: "Apple Health: aktif kalori & adım", colSpan: 2 },
  { id: "nextWorkout", title: "Antrenman", description: "Sıradaki seans", colSpan: 1 },
  { id: "weeklyBalance", title: "Haftalık kalori dengesi", description: "Alınan vs yakılan (TDEE)", colSpan: 2 },
  { id: "weightEnergyChart", title: "Ağırlık & Enerji Dengesi", description: "Trend + günlük alım", colSpan: 4 },
  { id: "energyRing", title: "Bugünün enerjisi", description: "Alınan / makrolar", colSpan: 1 },
  { id: "bodyComposition", title: "Vücut kompozisyonu", description: "Mi Scale 2", colSpan: 2 },
  { id: "biomarkers", title: "Son kan tahlili", description: "Öne çıkan biyobelirteçler", colSpan: 2 },
  { id: "adaptiveInsight", title: "Adaptif öneri", description: "TDEE'ye göre hedef", colSpan: 2 },
];

export const WIDGET_MAP = Object.fromEntries(WIDGETS.map((w) => [w.id, w]));

export interface WidgetLayoutItem {
  id: string;
  visible: boolean;
  order: number;
}

export function defaultLayout(): WidgetLayoutItem[] {
  return WIDGETS.map((w, i) => ({ id: w.id, visible: true, order: i }));
}

/** Merge a stored layout with the registry so newly-added widgets still appear. */
export function normalizeLayout(stored: WidgetLayoutItem[] | null): WidgetLayoutItem[] {
  const base = defaultLayout();
  if (!stored || stored.length === 0) return base;
  const byId = new Map(stored.map((s) => [s.id, s]));
  const merged = base.map((b) => {
    const s = byId.get(b.id);
    return s ? { id: b.id, visible: s.visible, order: s.order } : b;
  });
  return merged.sort((a, b) => a.order - b.order).map((w, i) => ({ ...w, order: i }));
}
