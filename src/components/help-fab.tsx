"use client";

import { useState } from "react";
import {
  HelpCircle,
  X,
  Upload,
  Scale,
  Utensils,
  Gauge,
  LayoutDashboard,
  SlidersHorizontal,
  BookOpen,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpItem {
  icon: typeof HelpCircle;
  title: string;
  content: string;
}

const HELP_ITEMS: HelpItem[] = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    content:
      "Ana ekranda tüm verilerinin özetini gör. Kartları sürükle-bırak ile sırala, 'Özelleştir' butonu ile gizle/göster.",
  },
  {
    icon: Upload,
    title: "Yükle & Oku",
    content:
      "Kan tahlili PDF veya tartı görseli yükle. AI değerleri okur — sen onaylamadan kayıt olmaz. Hatalı değerleri düzenleyebilirsin.",
  },
  {
    icon: Scale,
    title: "Biyometri",
    content:
      "Mi Body Composition Scale 2 ile Bluetooth ölçüm veya manuel giriş. Ölçüm geçmişi burada listelenir.",
  },
  {
    icon: Utensils,
    title: "Beslenme",
    content:
      "Günlük öğünlerini kaydet. Yiyecek ara, porsiyon belirle — kalori ve makrolar otomatik hesaplanır.",
  },
  {
    icon: Gauge,
    title: "Metabolizma",
    content:
      "Dynamic TDEE motoru kilo değişimi + kalori alımından gerçek metabolizma hızını öğrenir. En az 7 gün veri gerekir.",
  },
  {
    icon: SlidersHorizontal,
    title: "Özelleştirme",
    content:
      "Dashboard'da 'Özelleştir'e bas: kartları sürükle, gizle, yeniden göster. Tema: üst bar'dan light/dark/sistem seç.",
  },
];

export function HelpFab({ onReopenOnboarding }: { onReopenOnboarding: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 active:scale-95",
          open && "hidden",
        )}
        aria-label="Yardım"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {/* Help panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-80 max-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary-ink" />
              <h3 className="text-sm font-bold">Yardım</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-4">
            <div className="space-y-3">
              {HELP_ITEMS.map((item) => (
                <details key={item.title} className="group rounded-xl border border-border bg-surface-2">
                  <summary className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm font-medium text-ink marker:content-['']">
                    <item.icon className="h-4 w-4 shrink-0 text-primary-ink" />
                    <span className="flex-1">{item.title}</span>
                    <span className="text-xs text-ink-3 transition-transform group-open:rotate-90">
                      ▶
                    </span>
                  </summary>
                  <div className="border-t border-border px-3 py-2.5 text-xs leading-relaxed text-ink-2">
                    {item.content}
                  </div>
                </details>
              ))}
            </div>

            {/* Reopen onboarding */}
            <button
              onClick={() => {
                setOpen(false);
                onReopenOnboarding();
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-2 px-3 py-2.5 text-xs font-medium text-ink-2 transition-colors hover:text-primary-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Tanıtım turunu tekrar göster
            </button>

            {/* Disclaimer */}
            <p className="mt-3 text-center text-[0.65rem] text-ink-3">
              Bu uygulama tıbbi tavsiye vermez. Sonuçları hekiminizle değerlendirin.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
