"use client";

import { useState } from "react";
import {
  HelpCircle,
  X,
  Users,
  Dumbbell,
  FileText,
  MessageSquare,
  Eye,
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
    icon: Users,
    title: "Danışan Bağlama",
    content:
      "Danışanın Ayarlar → Koç Erişimi'nden davet kodu üretir. Danışanlar sayfasından 'Koç girişi (kod gir)' ile kodu gir ve bağlan.",
  },
  {
    icon: Dumbbell,
    title: "Program Oluştur",
    content:
      "Danışan sayfasında haftalık takvimden güne tıkla, 'Hareket ekle' ile egzersiz seç, set/tekrar belirle. Boş günler dinlenme sayılır. Kalori otomatik hesaplanır.",
  },
  {
    icon: FileText,
    title: "Serbest Plan",
    content:
      "Beslenme planı veya dönemsel hedefler için serbest metin planı yaz. Yeni plan yayınlandığında eski otomatik arşivlenir.",
  },
  {
    icon: MessageSquare,
    title: "Mesajlaşma",
    content:
      "Her danışanın sayfasının alt kısmında sohbet alanı var. Soru, geri bildirim ve takip mesajları buradan.",
  },
  {
    icon: Eye,
    title: "Önizleme",
    content:
      "'/coach/preview' sayfasında danışan bağlamadan program kurabilir, danışanın ekranını canlı önizleyebilirsin. Hiçbir şey kaydedilmez.",
  },
];

export function CoachHelpFab({ onReopenOnboarding }: { onReopenOnboarding: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 active:scale-95",
          open && "hidden",
        )}
        aria-label="Koç Yardım"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-80 max-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary-ink" />
              <h3 className="text-sm font-bold">Koç Rehberi</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

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

            <button
              onClick={() => {
                setOpen(false);
                onReopenOnboarding();
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-2 px-3 py-2.5 text-xs font-medium text-ink-2 transition-colors hover:text-primary-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Koç tanıtım turunu tekrar göster
            </button>

            <p className="mt-3 text-center text-[0.65rem] text-ink-3">
              Danışanlarının verileri yalnızca sana açtıkları modüllerle sınırlıdır.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
