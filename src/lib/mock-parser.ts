// ─────────────────────────────────────────────────────────────
// Mock document parser (PARSE_PROVIDER="mock").
// Stands in for the Python/FastAPI OCR + Claude-Vision microservice so the
// full ingestion → review → confirm flow works with no API key or cost.
// Swap for the real provider by setting PARSE_PROVIDER="claude".
// ─────────────────────────────────────────────────────────────

export interface ParsedBiomarker {
  code: string;
  name: string;
  value: number;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  flag: "low" | "normal" | "high";
  confidence: number;
}

export interface ParsedLab {
  panelName: string;
  labName: string;
  collectedAt: string; // ISO
  confidence: number;
  biomarkers: ParsedBiomarker[];
}

export interface ParsedInbody {
  confidence: number;
  weightKg: number;
  bodyFatPct: number;
  skeletalMuscleKg: number;
  visceralFat: number;
  bodyWaterPct: number;
  bmrDevice: number;
  impedance: number;
}

function jitter(base: number, pct = 0.04): number {
  return Number((base * (1 + (Math.random() - 0.5) * 2 * pct)).toFixed(2));
}

function flagFor(v: number, lo: number | null, hi: number | null): ParsedBiomarker["flag"] {
  if (lo != null && v < lo) return "low";
  if (hi != null && v > hi) return "high";
  return "normal";
}

const LAB_TEMPLATE: Omit<ParsedBiomarker, "flag">[] = [
  { code: "GLU", name: "Açlık Glukoz", value: 92, unit: "mg/dL", refLow: 74, refHigh: 106, confidence: 0.98 },
  { code: "HBA1C", name: "HbA1c", value: 5.2, unit: "%", refLow: 4.0, refHigh: 5.6, confidence: 0.97 },
  { code: "CHOL", name: "Total Kolesterol", value: 208, unit: "mg/dL", refLow: 0, refHigh: 200, confidence: 0.96 },
  { code: "LDL", name: "LDL Kolesterol", value: 142, unit: "mg/dL", refLow: 0, refHigh: 130, confidence: 0.95 },
  { code: "HDL", name: "HDL Kolesterol", value: 48, unit: "mg/dL", refLow: 40, refHigh: 100, confidence: 0.96 },
  { code: "TRIG", name: "Trigliserid", value: 128, unit: "mg/dL", refLow: 0, refHigh: 150, confidence: 0.95 },
  { code: "TSH", name: "TSH", value: 1.8, unit: "mIU/L", refLow: 0.4, refHigh: 4.0, confidence: 0.97 },
  { code: "VITD", name: "D Vitamini (25-OH)", value: 21, unit: "ng/mL", refLow: 30, refHigh: 100, confidence: 0.93 },
  { code: "FERR", name: "Ferritin", value: 96, unit: "ng/mL", refLow: 30, refHigh: 400, confidence: 0.94 },
  { code: "B12", name: "Vitamin B12", value: 380, unit: "pg/mL", refLow: 200, refHigh: 900, confidence: 0.95 },
  { code: "ALT", name: "ALT", value: 24, unit: "U/L", refLow: 0, refHigh: 41, confidence: 0.96 },
  { code: "CRP", name: "CRP", value: 1.2, unit: "mg/L", refLow: 0, refHigh: 5, confidence: 0.94 },
];

export function mockParseLab(): ParsedLab {
  const biomarkers: ParsedBiomarker[] = LAB_TEMPLATE.map((b) => {
    const value = jitter(b.value, 0.03);
    return { ...b, value, flag: flagFor(value, b.refLow, b.refHigh) };
  });
  return {
    panelName: "Genel Sağlık + Lipid Paneli",
    labName: "Acıbadem Labmed",
    collectedAt: new Date(Date.now() - 8 * 86_400_000).toISOString(),
    confidence: 0.96,
    biomarkers,
  };
}

export function mockParseInbody(): ParsedInbody {
  const weightKg = jitter(82.4, 0.01);
  const bodyFatPct = jitter(18.6, 0.03);
  const leanFrac = 1 - bodyFatPct / 100;
  return {
    confidence: 0.95,
    weightKg,
    bodyFatPct,
    skeletalMuscleKg: Number((weightKg * leanFrac * 0.54).toFixed(1)),
    visceralFat: 8,
    bodyWaterPct: Number((leanFrac * 73).toFixed(1)),
    bmrDevice: Math.round(370 + 21.6 * weightKg * leanFrac),
    impedance: 486,
  };
}
