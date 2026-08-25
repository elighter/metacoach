"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Check, CheckCircle2, Circle, Utensils, Clock, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_OPTIONS,
  LAB_REFS,
  LAB_FLAG_LABEL,
  labFlag,
  assessmentReadiness,
  type AssessmentData,
} from "@/lib/assessment";

const FLAG_STYLE = {
  low: "bg-warn-wash text-warn",
  high: "bg-crit-wash text-crit",
  normal: "bg-good-wash text-good",
} as const;

const LAB_FIELDS: { key: "b12" | "vitaminD" | "fastingInsulin" | "homaIR" | "tsh"; label: string }[] = [
  { key: "b12", label: "B12" },
  { key: "vitaminD", label: "D vitamini (25-OH)" },
  { key: "fastingInsulin", label: "Açlık insülini" },
  { key: "homaIR", label: "İnsülin direnci (HOMA-IR)" },
  { key: "tsh", label: "TSH (tiroit)" },
];

export function AssessmentClient({ initial }: { initial: AssessmentData }) {
  const router = useRouter();
  const [form, setForm] = useState<AssessmentData>(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  const readiness = useMemo(() => assessmentReadiness(form), [form]);

  function set<K extends keyof AssessmentData>(k: K, v: AssessmentData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setState("idle");
  }

  function setNum(k: "b12" | "vitaminD" | "fastingInsulin" | "homaIR" | "tsh", raw: string) {
    set(k, raw === "" ? "" : Number(raw));
  }

  async function save(submit: boolean) {
    setState("saving");
    const payload = {
      dietRecall: form.dietRecall || null,
      wakeTime: form.wakeTime || null,
      sleepTime: form.sleepTime || null,
      activityLevel: form.activityLevel || null,
      routineNote: form.routineNote || null,
      b12: form.b12 === "" ? null : form.b12,
      vitaminD: form.vitaminD === "" ? null : form.vitaminD,
      fastingInsulin: form.fastingInsulin === "" ? null : form.fastingInsulin,
      homaIR: form.homaIR === "" ? null : form.homaIR,
      tsh: form.tsh === "" ? null : form.tsh,
      labNote: form.labNote || null,
      submit,
    };
    const res = await fetch("/api/assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setForm((f) => ({
        ...f,
        status: data.status,
        submittedAt: submit ? new Date().toISOString() : f.submittedAt,
      }));
      setState("saved");
      router.refresh();
    } else {
      setState("idle");
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Hazırlık durumu */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="label mb-0">Görüşme hazırlığı</span>
            <p className="mt-0.5 text-sm text-ink-3">
              {readiness.ready
                ? "Zorunlu bölümler tamam — görüşmeye hazırsınız."
                : "Yemek ve rutin bölümlerini doldurun."}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums text-primary-ink">%{readiness.pct}</div>
            {form.status === "submitted" && (
              <span className="pill bg-good-wash text-good">Gönderildi</span>
            )}
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${readiness.pct}%` }}
          />
        </div>
        <ul className="mt-3 space-y-1.5">
          {readiness.checks.map((c) => (
            <li key={c.key} className="flex items-center gap-2 text-sm">
              {c.done ? (
                <CheckCircle2 className="h-4 w-4 text-good" />
              ) : (
                <Circle className="h-4 w-4 text-ink-3" />
              )}
              <span className={cn(c.done ? "text-ink" : "text-ink-3")}>{c.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 1 — Günlük yemek alışkanlıkları */}
      <Section
        icon={Utensils}
        title="1 · Günlük yemek alışkanlıklarınız"
        hint="Son 2-3 günde ne yediğinize dair kısa bir liste."
      >
        <textarea
          className="input min-h-[120px] resize-y leading-relaxed"
          placeholder={
            "Örn:\nDün — kahvaltı: yumurta + peynir + zeytin; öğle: tavuklu salata; akşam: mercimek çorbası + pilav\nEvvelsi gün — ..."
          }
          value={form.dietRecall}
          onChange={(e) => set("dietRecall", e.target.value)}
        />
      </Section>

      {/* 2 — Kişisel rutin */}
      <Section
        icon={Clock}
        title="2 · Kişisel rutininiz"
        hint="Uyanış/uyku saatleriniz ve gün içindeki hareket seviyeniz."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <L label="Uyanış saati">
            <input
              type="time"
              className="input"
              value={form.wakeTime}
              onChange={(e) => set("wakeTime", e.target.value)}
            />
          </L>
          <L label="Uyku saati">
            <input
              type="time"
              className="input"
              value={form.sleepTime}
              onChange={(e) => set("sleepTime", e.target.value)}
            />
          </L>
          <L label="Hareket seviyesi">
            <select
              className="input"
              value={form.activityLevel}
              onChange={(e) => set("activityLevel", e.target.value)}
            >
              <option value="">Seçin…</option>
              {ACTIVITY_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </L>
        </div>
        <div className="mt-4">
          <L label="Ek not (opsiyonel)">
            <input
              className="input"
              placeholder="Örn: masa başı iş, akşamları 30 dk yürüyüş"
              value={form.routineNote}
              onChange={(e) => set("routineNote", e.target.value)}
            />
          </L>
        </div>
      </Section>

      {/* 3 — Kan tahlilleri */}
      <Section
        icon={FlaskConical}
        title="3 · Son kan tahlilleriniz (varsa)"
        hint="B12, D vitamini, insülin direnci ve tiroit değerleri diyetisyenin yaklaşımını doğrudan etkiler."
      >
        <div className="space-y-3">
          {LAB_FIELDS.map(({ key, label }) => {
            const ref = LAB_REFS[key];
            const flag = labFlag(key, form[key]);
            return (
              <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
                <span className="text-sm font-medium text-ink-2">{label}</span>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    className="input pr-14"
                    placeholder="—"
                    value={form[key]}
                    onChange={(e) => setNum(key, e.target.value)}
                  />
                  {ref.unit && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-3">
                      {ref.unit}
                    </span>
                  )}
                </div>
                <span className={cn("pill justify-center", flag ? FLAG_STYLE[flag] : "text-ink-3")}>
                  {flag ? LAB_FLAG_LABEL[flag] : "—"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-ink-3">
          Referans aralıkları bilgilendirme amaçlıdır; tanı yerine geçmez. Değerlendirmeyi koçunuzla
          yapın.
        </p>
        <div className="mt-4">
          <L label="Tahlil notu (opsiyonel)">
            <input
              className="input"
              placeholder="Örn: 2 hafta önce alındı, aç karnına"
              value={form.labNote}
              onChange={(e) => set("labNote", e.target.value)}
            />
          </L>
        </div>
      </Section>

      {/* Kaydet / Gönder */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" onClick={() => save(false)} disabled={state === "saving"}>
          {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Taslak kaydet
        </button>
        <button
          className="btn btn-primary"
          onClick={() => save(true)}
          disabled={state === "saving" || !readiness.ready}
          title={readiness.ready ? "" : "Önce yemek ve rutin bölümlerini doldurun"}
        >
          {state === "saved" ? <Check className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          Görüşmeye gönder
        </button>
        <span className="text-xs text-ink-3">
          {state === "saved" ? "Kaydedildi." : "Cevaplarınız koçunuzla paylaşılmak üzere saklanır."}
        </span>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-wash text-primary-ink">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-3">{hint}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
