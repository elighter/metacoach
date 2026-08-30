"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Dumbbell,
  FileText,
  MessageSquare,
  Eye,
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
    title: "Koç Paneline hoş geldin!",
    description:
      "Danışanlarının beslenme, antrenman ve sağlık verilerini tek ekrandan takip et, program yaz ve mesajlaş.",
    tips: [
      "Danışanlarının sana açtığı modülleri görürsün — veri gizliliği onların kontrolünde.",
      "Her danışan için haftalık program, serbest plan ve mesajlaşma alanın var.",
      "Sağ alttaki yardım butonundan her zaman bu rehbere ulaşabilirsin.",
    ],
  },
  {
    icon: Users,
    title: "Danışan Bağlantısı",
    description:
      "Danışanın Ayarlar → Koç Erişimi'nden bir davet kodu üretir ve sana gönderir. Sen bu kodu girerek bağlanırsın.",
    tips: [
      "Danışanlar → 'Koç girişi (kod gir)' butonuna tıkla.",
      "Danışanın verdiği 10 haneli kodu gir — anında bağlanırsın.",
      "Danışan hangi modülleri paylaşacağını seçer (antrenman, beslenme, biyometri vb.).",
    ],
  },
  {
    icon: Dumbbell,
    title: "Haftalık Program Oluştur",
    description:
      "Danışan sayfasında haftalık program builder ile günlere hareket ekle, set ve tekrar belirle.",
    tips: [
      "Haftanın her gününe tıklayıp hareket ekle — boş günler otomatik dinlenme sayılır.",
      "Hareket kütüphanesinden seç: aktivasyon, kuvvet, fonksiyonel, kardiyo, soğuma.",
      "Kalori otomatik hesaplanır; program danışanın Antrenman ekranına düşer.",
    ],
  },
  {
    icon: FileText,
    title: "Serbest Plan Yaz",
    description:
      "Program builder'a ek olarak serbest metin ile beslenme planı, genel notlar veya dönemsel hedefler yazabilirsin.",
    tips: [
      "Plan başlığı ve açıklaması gir, 'Yayınla' de.",
      "Yeni plan yayınlandığında eskisi otomatik arşivlenir.",
      "Danışan planını 'Planım' sayfasından görür.",
    ],
  },
  {
    icon: MessageSquare,
    title: "Danışanla Mesajlaş",
    description:
      "Her danışan sayfasının altında mesajlaşma alanı var. Sorular, geri bildirimler ve takip buradan.",
    tips: [
      "Mesaj yaz, Enter veya Cmd+Enter ile gönder.",
      "Danışan da aynı alanda sana mesaj atabilir.",
      "Haftalık özet e-postası ile danışan durumlarını takip et.",
    ],
  },
  {
    icon: Eye,
    title: "Önizleme ile Dene",
    description:
      "Herhangi bir danışan bağlamadan programın nasıl göründüğünü test etmek için Önizleme sayfasını kullanabilirsin.",
    tips: [
      "Ayarlar sayfasından veya buradan '/coach/preview' adresine git.",
      "Sol tarafta program kur, sağda danışanın görünümünü anında izle.",
      "Önizlemede hiçbir şey kaydedilmez — rahatça dene.",
    ],
  },
];

const LS_KEY = "mc-coach-onboarded";

export function useCoachOnboarding() {
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

export function CoachOnboardingWizard({
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

        {/* Close */}
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
