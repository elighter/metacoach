// Ön değerlendirme yardımcıları — antrenör görüşmesi öncesi hazırlık anketi.
// Sayfa (server) ve form (client) arasında paylaşılan etiket/tamamlanma/
// referans-aralığı mantığı.

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Hareketsiz",
  light: "Az aktif",
  moderate: "Orta",
  active: "Aktif",
  athlete: "Sporcu",
};

export const ACTIVITY_OPTIONS = Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][];

/** Anketin, sayfa/form/API arasında taşınan biçimi (Date'ler ISO string). */
export interface AssessmentData {
  dietRecall: string;
  wakeTime: string;
  sleepTime: string;
  activityLevel: string;
  routineNote: string;
  b12: number | "";
  vitaminD: number | "";
  fastingInsulin: number | "";
  homaIR: number | "";
  tsh: number | "";
  labNote: string;
  status: string; // draft | submitted
  submittedAt: string | null;
}

export const EMPTY_ASSESSMENT: AssessmentData = {
  dietRecall: "",
  wakeTime: "",
  sleepTime: "",
  activityLevel: "",
  routineNote: "",
  b12: "",
  vitaminD: "",
  fastingInsulin: "",
  homaIR: "",
  tsh: "",
  labNote: "",
  status: "draft",
  submittedAt: null,
};

/**
 * Görüşme hazırlığı için tamamlanma durumu. Kan tahlilleri "varsa" istendiği
 * için opsiyonel; hazırlık skoru zorunlu iki bölüme (yemek + rutin) dayanır.
 */
export function assessmentReadiness(a: AssessmentData) {
  const checks: { key: string; label: string; done: boolean }[] = [
    { key: "diet", label: "Günlük yemek alışkanlıkları", done: a.dietRecall.trim().length > 0 },
    {
      key: "routine",
      label: "Kişisel rutin (uyku & hareket)",
      done: a.wakeTime !== "" && a.sleepTime !== "" && a.activityLevel !== "",
    },
    {
      key: "labs",
      label: "Kan tahlilleri (varsa)",
      done: [a.b12, a.vitaminD, a.fastingInsulin, a.homaIR, a.tsh].some((v) => v !== ""),
    },
  ];
  const done = checks.filter((c) => c.done).length;
  // Yemek + rutin dolduğunda görüşmeye hazır sayılır; tahliller bonus.
  const required = checks.slice(0, 2);
  const ready = required.every((c) => c.done);
  return {
    checks,
    done,
    total: checks.length,
    pct: Math.round((done / checks.length) * 100),
    ready,
  };
}

export type LabFlag = "low" | "normal" | "high";

interface LabRef {
  low: number;
  high: number;
  unit: string;
  /** Yüksek değer beklenen/istenen mi? HOMA-IR & insülinde yüksek = uyarı. */
}

export const LAB_REFS: Record<"b12" | "vitaminD" | "fastingInsulin" | "homaIR" | "tsh", LabRef> = {
  b12: { low: 200, high: 900, unit: "pg/mL" },
  vitaminD: { low: 30, high: 100, unit: "ng/mL" },
  fastingInsulin: { low: 2.6, high: 24.9, unit: "µIU/mL" },
  homaIR: { low: 0, high: 2.5, unit: "" },
  tsh: { low: 0.4, high: 4.0, unit: "mIU/L" },
};

export function labFlag(code: keyof typeof LAB_REFS, value: number | ""): LabFlag | null {
  if (value === "" || Number.isNaN(Number(value))) return null;
  const v = Number(value);
  const ref = LAB_REFS[code];
  if (v < ref.low) return "low";
  if (v > ref.high) return "high";
  return "normal";
}

export const LAB_FLAG_LABEL: Record<LabFlag, string> = {
  low: "Düşük",
  normal: "Normal",
  high: "Yüksek",
};
