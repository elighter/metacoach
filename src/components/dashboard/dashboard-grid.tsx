"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, EyeOff, Plus, Check, SlidersHorizontal } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-data";
import { WIDGET_MAP, normalizeLayout, type WidgetLayoutItem } from "@/lib/widgets";
import { DashboardWidget } from "@/components/dashboard/widgets";
import { cn } from "@/lib/utils";

// Span'ler 4 sütunlu grid'i temiz döşesin diye 1 / 2 / 4 ile sınırlı.
const SPAN_CLASS: Record<number, string> = {
  1: "lg:col-span-1",
  2: "md:col-span-2 lg:col-span-2",
  4: "md:col-span-2 lg:col-span-4",
};

function SortableWidget({
  id,
  data,
  edit,
  onHide,
}: {
  id: string;
  data: DashboardData;
  edit: boolean;
  onHide: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !edit,
  });
  const def = WIDGET_MAP[id];
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(SPAN_CLASS[def?.colSpan ?? 1], isDragging && "z-10 opacity-80")}
    >
      <div className={cn("relative h-full", edit && "rounded-xl outline-dashed outline-2 outline-offset-4 outline-border-strong")}>
        {edit && (
          <div className="absolute -top-3 left-2 z-10 flex items-center gap-1">
            <button
              {...attributes}
              {...listeners}
              className="flex h-6 cursor-grab items-center gap-1 rounded-md border border-border bg-surface px-2 text-[0.65rem] font-medium text-ink-2 shadow-card active:cursor-grabbing"
              aria-label="Taşı"
            >
              <GripVertical className="h-3 w-3" /> taşı
            </button>
            <button
              onClick={() => onHide(id)}
              className="grid h-6 w-6 place-items-center rounded-md border border-border bg-surface text-ink-3 shadow-card hover:text-crit"
              aria-label="Gizle"
            >
              <EyeOff className="h-3 w-3" />
            </button>
          </div>
        )}
        <DashboardWidget id={id} data={data} />
      </div>
    </div>
  );
}

export function DashboardGrid({
  data,
  initialLayout,
}: {
  data: DashboardData;
  initialLayout: WidgetLayoutItem[];
}) {
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(normalizeLayout(initialLayout));
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visible = layout.filter((w) => w.visible).sort((a, b) => a.order - b.order);
  const hidden = layout.filter((w) => !w.visible);

  function persist(next: WidgetLayoutItem[]) {
    setLayout(next);
    setSaving(true);
    fetch("/api/dashboard/layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgets: next }),
    })
      .catch(() => {})
      .finally(() => setSaving(false));
  }

  function reorder(orderedIds: string[]) {
    const next = layout.map((w) => {
      const idx = orderedIds.indexOf(w.id);
      return idx === -1 ? w : { ...w, order: idx };
    });
    persist(next);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = visible.map((w) => w.id);
    const next = arrayMove(ids, ids.indexOf(active.id as string), ids.indexOf(over.id as string));
    reorder(next);
  }

  function setVisible(id: string, vis: boolean) {
    const maxOrder = Math.max(-1, ...layout.map((w) => w.order));
    persist(layout.map((w) => (w.id === id ? { ...w, visible: vis, order: vis ? maxOrder + 1 : w.order } : w)));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{(() => { const h = new Date().getHours(); return h >= 5 && h < 12 ? "Günaydın" : h >= 12 && h < 18 ? "İyi günler" : "İyi akşamlar"; })()}, {data.user.name.trim().split(" ")[0]} 👋</h1>
          <p className="text-sm text-ink-3">
            {new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" })} · Metabolizman{" "}
            <b className="text-good">öğreniliyor</b> — {data.tdee.nDaysWithCalories} günlük veri
          </p>
        </div>
        <button
          onClick={() => setEdit((e) => !e)}
          className={cn("btn", edit && "btn-primary")}
        >
          {edit ? <Check className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
          {edit ? (saving ? "Kaydediliyor…" : "Bitti") : "Özelleştir"}
        </button>
      </div>

      {edit && hidden.length > 0 && (
        <div className="card mb-4 p-3">
          <div className="kicker mb-2">Gizli kartlar</div>
          <div className="flex flex-wrap gap-2">
            {hidden.map((w) => (
              <button
                key={w.id}
                onClick={() => setVisible(w.id, true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border-strong bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-2 hover:text-ink"
              >
                <Plus className="h-3.5 w-3.5" />
                {WIDGET_MAP[w.id]?.title ?? w.id}
              </button>
            ))}
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={visible.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-4 [grid-auto-flow:dense] md:grid-cols-2 lg:grid-cols-4">
            {visible.map((w) => (
              <SortableWidget key={w.id} id={w.id} data={data} edit={edit} onHide={(id) => setVisible(id, false)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <p className="mt-6 rounded-xl border border-dashed border-border bg-surface-2 p-3 text-center text-xs text-ink-3">
        ⚕️ Bu ekran tıbbi tavsiye değildir. Biyobelirteç yorumları için hekiminize danışın.
      </p>
    </div>
  );
}
