// ─────────────────────────────────────────────────────────────
// Xiaomi Mi Body Composition Scale 2 integration helpers.
//
// The scale itself only measures WEIGHT + BIO-IMPEDANCE (ohms). Every other
// metric (body fat, muscle, water, visceral fat, BMR) is *derived* from those
// two plus the user's height/age/sex. Below is a cleaned approximation of the
// reverse-engineered Xiaomi algorithm (cf. the open-source `openScale` project).
//
// Pure functions → safe to run on server (estimation) and client (BLE decode).
// ─────────────────────────────────────────────────────────────

export interface MiCompositionInput {
  weightKg: number;
  impedance: number; // ohms
  heightCm: number;
  age: number;
  sex?: string | null; // "male" | "female"
}

export interface MiComposition {
  weightKg: number;
  impedance: number;
  bodyFatPct: number;
  skeletalMuscleKg: number;
  bodyWaterPct: number;
  visceralFat: number;
  boneMassKg: number;
  bmr: number;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Lean Body Mass coefficient (Xiaomi-derived). */
function lbmCoefficient(i: MiCompositionInput): number {
  let lbm = (i.heightCm * 9.058) / 100;
  lbm *= i.heightCm / 100;
  lbm += i.weightKg * 0.32 + 12.226;
  lbm -= i.impedance * 0.0068;
  lbm -= i.age * 0.0542;
  return lbm;
}

export function miBodyComposition(i: MiCompositionInput): MiComposition {
  const isFemale = i.sex === "female";
  const lbm = lbmCoefficient(i);

  // Body fat %: fraction of mass that is NOT lean, with a small sex offset
  // reflecting typical essential-fat differences.
  const sexOffset = isFemale ? 4.2 : -2.8;
  let bodyFat = (1 - lbm / i.weightKg) * 100 + sexOffset;
  bodyFat = clamp(bodyFat, 5, 60);

  const leanFrac = 1 - bodyFat / 100;

  // Skeletal muscle ≈ lean mass minus bone & organ overhead.
  const boneMass = clamp(0.045 * lbm, 1.8, 4.2);
  const skeletalMuscle = clamp(i.weightKg * leanFrac * 0.54, 10, 60);

  // Total body water ≈ 73% of lean mass, expressed as % of body weight.
  const bodyWater = clamp(leanFrac * 73.2, 35, 75);

  // Visceral fat index (1–20 scale, rough).
  const visceral = clamp(Math.round((bodyFat - 8) / 2.4 + i.age / 22), 1, 20);

  // Katch-McArdle BMR from lean body mass.
  const bmr = Math.round(370 + 21.6 * (i.weightKg * leanFrac));

  return {
    weightKg: Number(i.weightKg.toFixed(2)),
    impedance: Math.round(i.impedance),
    bodyFatPct: Number(bodyFat.toFixed(1)),
    skeletalMuscleKg: Number(skeletalMuscle.toFixed(1)),
    bodyWaterPct: Number(bodyWater.toFixed(1)),
    visceralFat: visceral,
    boneMassKg: Number(boneMass.toFixed(1)),
    bmr,
  };
}

// ── BLE payload decoding (Mi Body Composition Scale 2, service 0x181B) ──
// 13-byte little-endian frame: [ctrl0, ctrl1, year(2), M, D, h, m, s, imp(2), wt(2)]
export interface MiScaleReading {
  weightKg: number;
  impedance: number | null;
  stabilized: boolean;
  impedanceReady: boolean;
  measuredAt: Date | null;
}

export function parseMiScalePayload(bytes: Uint8Array): MiScaleReading | null {
  if (bytes.length < 13) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ctrl0 = bytes[0];
  const ctrl1 = bytes[1];
  const stabilized = (ctrl1 & (1 << 5)) !== 0;
  const impedanceReady = (ctrl1 & (1 << 1)) !== 0;

  // Unit detection: ctrl0 bit0 = "not catty" flag; ctrl1 bit4 = kg display.
  // Three modes: catty/jin (both 0), kg (bit0=1 & bit4=1), lbs (bit0=1 & bit4=0).
  // Catty and kg both use raw/200 to get kg; lbs uses (raw/100)*0.45359237.
  const notCatty = (ctrl0 & 0x01) !== 0;
  const kgDisplay = (ctrl1 & (1 << 4)) !== 0;
  const isLbs = notCatty && !kgDisplay;

  const impedanceRaw = view.getUint16(9, true);
  const weightRaw = view.getUint16(11, true);
  const weightKg = isLbs
    ? (weightRaw / 100) * 0.45359237
    : weightRaw / 200;

  // Timestamp: bytes 2-3 = year (uint16 LE), 4 = month, 5 = day, 6 = h, 7 = m, 8 = s.
  const year = view.getUint16(2, true);
  const month = bytes[4];
  const day = bytes[5];
  const hour = bytes[6];
  const minute = bytes[7];
  const second = bytes[8];
  let measuredAt: Date | null = null;
  if (year >= 2020 && year <= 2099 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    measuredAt = new Date(year, month - 1, day, hour, minute, second);
  }

  return {
    weightKg: Number(weightKg.toFixed(2)),
    impedance: impedanceReady ? impedanceRaw : null,
    stabilized,
    impedanceReady,
    measuredAt,
  };
}

/** Deterministic-ish simulated reading around a base weight — POC demo path. */
export function simulateMiScaleReading(baseWeightKg: number): {
  weightKg: number;
  impedance: number;
} {
  const noise = (Math.random() - 0.5) * 0.6; // ±0.3 kg water noise
  const weightKg = Number((baseWeightKg + noise).toFixed(2));
  const impedance = Math.round(480 + (Math.random() - 0.5) * 40); // ~460–500 Ω
  return { weightKg, impedance };
}

// BLE service/characteristic UUIDs used by Web Bluetooth on supported browsers.
export const MI_SCALE_BLE = {
  bodyCompositionService: 0x181b,
  bodyCompositionMeasurement: 0x2a9c,
  weightScaleService: 0x181d,
  weightMeasurement: 0x2a9d,
};
