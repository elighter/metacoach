"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  Scale,
  Utensils,
  LayoutDashboard,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Sparkles,
    title: "MetaCoach'a hoş geldin!",
    description:
      "Kan tahlili ve vücut ölçümlerini AI ile okuyan, gerçek metabolizma hızını öğrenen kişisel sağlık asistanın.",
    tips: [
      "Tüm verilerin sadece sana ait — üçüncü tarafla paylaşılmaz.",
      "Ekranlar kişiselleştirilebilir: dashboard'da kartları sürükle-bırak ile düzenle.",
      "Dark / light / sistem teması üst menüden seçilebilir.",
    ],
  },
  {
    icon: Upload,
    title: "Tahlil & Ölçüm Yükle",
    description:
      "Kan tahlili PDF'ini veya InBody/akıllı tartı görselini yükle — AI değerleri otomatik okur, sen onaylarsın.",
    tips: [
      "Desteklenen formatlar: PDF, JPG, PNG.",
      "AI okuması sonrası değerleri düzenleyebilirsin.",
      "Onaylamadan hiçbir veri kaydedilmez.",
    ],
  },
  {
    icon: Scale,
    title: "Biyometri & Tartı",
    description:
      "Mi Body Composition Scale 2 ile Bluetooth üzerinden anlık ölçüm al, ya da manuel gir.",
    tips: [
      "Bluetooth bağlantısı için tartıya basıp bekleme moduna al.",
      "Ölçüm geçmişi Biyometri sayfasında listelenir.",
      "Simülatör ile Bluetooth olmadan test edebilirsin.",
    ],
  },
  {
    icon: Utensils,
    title: "Beslenme Takibi",
    description:
      "Günlük öğünlerini kaydet — kalori ve makro besin değerleri otomatik hesaplanır.",
    tips: [
      "Yiyecek veritabanından hızlı arama yap.",
      "Kahvaltı, öğle, akşam ve atıştırmalık olarak kategorize et.",
      "Veriler metabolizma hesabına dahil edilir.",
    ],
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard & Metabolizma",
    description:
      "Veriler toplandıkça Dynamic TDEE motoru gerçek metabolizma hızını öğrenir. Dashboard'da her şeyi takip et.",
    tips: [
      "En az 7 günlük kilo + kalori verisi ile TDEE hesaplanmaya başlar.",
      "Dashboard kartlarını sürükle-bırak ile özelleştir.",
      "Metabolizma sayfasından detaylı analiz ve yeniden hesaplama yap.",
    ],
  },
];

const LS_KEY = "mc-onboarded";

export function useOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(LS_KEY)) {
      setShow(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(LS_KEY, new Date().toISOString());
    setShow(false);
  }

  function reopen() {
    setShow(true);
  }

  return { show, dismiss, reopen };
}

export function OnboardingWizard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
        {/* Progress bar */}
        <div className="flex gap-1 px-5 pt-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-surface-2",
              )}
            />
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="px-6 pb-6 pt-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-wash">
              <Icon className="h-5 w-5 text-primary-ink" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight">{current.title}</h2>
              <span className="text-xs text-ink-3">
                {step + 1} / {STEPS.length}
              </span>
            </div>
          </div>

          <p className="mb-4 text-sm leading-relaxed text-ink-2">{current.description}</p>

          <ul className="space-y-2">
            {current.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className={cn(
              "btn btn-ghost flex items-center gap-1 text-sm",
              step === 0 && "invisible",
            )}
          >
            <ChevronLeft className="h-4 w-4" /> Geri
          </button>

          {isLast ? (
            <button onClick={onClose} className="btn btn-primary flex items-center gap-1 text-sm">
              Başlayalım! <Sparkles className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="btn btn-primary flex items-center gap-1 text-sm"
            >
              Devam <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
