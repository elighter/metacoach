// AI workout program generator (PARSE_PROVIDER="claude" + ANTHROPIC_API_KEY).
// Claude designs a personalized 3-day A/B program constrained to the exercises
// in our library (it may ONLY pick from provided slugs). A single forced tool
// call returns structured days; the caller validates slugs against the DB and
// falls back to the deterministic template (workout.ts) on any failure.

import Anthropic from "@anthropic-ai/sdk";
import { EXERCISE_LIBRARY, type Phase } from "./workout-library";
import type { DayType, Goal } from "./workout";

const MODEL = process.env.CLAUDE_PARSE_MODEL || "claude-sonnet-5";

export interface AIPlannedSet {
  slug: string;
  phase: Phase;
  targetSets: number;
  targetReps: string;
}
export interface AIPlannedDay {
  dayType: DayType;
  sets: AIPlannedSet[];
}
export interface AIProgram {
  name: string;
  notes: string;
  days: AIPlannedDay[];
}

export interface AthleteProfile {
  goal: Goal;
  daysPerWeek: number;
  sex: string | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  bodyFatPct: number | null;
  activityBase: string;
  labFlags?: string[]; // e.g. ["LDL yüksek", "D vitamini düşük"]
}

const setSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    slug: { type: "string", description: "SADECE verilen listeden bir egzersiz slug'ı" },
    phase: { type: "string", enum: ["activation", "strength", "functional", "cardio", "cooldown"] },
    targetSets: { type: "number" },
    targetReps: { type: "string", description: "ör. '8-12', '40 sn', '20 dk'" },
  },
  required: ["slug", "phase", "targetSets", "targetReps"],
};

const programSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    name: { type: "string", description: "Program adı (Türkçe, kısa)" },
    notes: { type: "string", description: "Kişiye özel kısa koçluk notu (Türkçe, 1-2 cümle)" },
    days: {
      type: "array",
      description: "Haftalık antrenman günleri, A/B dönüşümlü",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          dayType: { type: "string", enum: ["strength", "functional"] },
          sets: { type: "array", items: setSchema },
        },
        required: ["dayType", "sets"],
      },
    },
  },
  required: ["name", "notes", "days"],
};

function libraryDigest(): string {
  return EXERCISE_LIBRARY.map(
    (e) => `${e.slug} | ${e.phase} | ${e.equipment} | ${e.name}`,
  ).join("\n");
}

function buildPrompt(p: AthleteProfile): string {
  return `Sen deneyimli bir kuvvet & kondisyon koçusun. Aşağıdaki sporcu için ${p.daysPerWeek} günlük,
A/B dönüşümlü (A = full-body kuvvet, B = full-body fonksiyonel) bir haftalık program tasarla.

HER antrenman günü tam olarak 4 fazı bu sırayla içermeli:
1) activation (2-3 egzersiz): mobilite/SMR/dinamik esneme/düşük tempo kardiyo
2) strength VEYA functional (5-6 egzersiz, güne göre): full-body ana yüklenme
3) cardio (1 egzersiz): ana yüklenme sonrası yağ yakımı/kondisyon
4) cooldown (2-3 egzersiz): statik esneme + SMR + nefes

Kurallar:
- Egzersizleri SADECE aşağıdaki listeden slug ile seç. Liste dışı slug KULLANMA.
- Hedefe göre set/tekrar ayarla: cut → daha yüksek tekrar (10-12) + biraz daha uzun kardiyo; bulk → düşük tekrar (6-10), kısa kardiyo; maintain → 8-12.
- Ana yüklenmede full-body dengesi kur (bacak + itme + çekme + kalça menteşesi).
- notes alanında sporcunun hedefi/laboratuvar bulgularına 1-2 cümlelik kişisel dokunuş yap.

SPORCU:
- Hedef: ${p.goal}
- Cinsiyet: ${p.sex ?? "?"}, Yaş: ${p.age ?? "?"}, Boy: ${p.heightCm ?? "?"} cm, Kilo: ${p.weightKg ?? "?"} kg, Yağ%: ${p.bodyFatPct ?? "?"}
- Aktivite tabanı: ${p.activityBase}
${p.labFlags?.length ? `- Laboratuvar bulguları: ${p.labFlags.join(", ")}` : ""}

KULLANILABİLİR EGZERSİZLER (slug | faz | ekipman | ad):
${libraryDigest()}

create_program aracını çağır.`;
}

export async function generateProgramWithClaude(profile: AthleteProfile): Promise<AIProgram> {
  const res = await new Anthropic().messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "disabled" },
    tools: [
      {
        name: "create_program",
        description: "Kişiye özel antrenman programını kaydet",
        input_schema: programSchema,
        strict: true,
      } as Anthropic.Tool,
    ],
    tool_choice: { type: "tool", name: "create_program" },
    messages: [{ role: "user", content: [{ type: "text", text: buildPrompt(profile) }] }],
  });
  const tu = res.content.find((b) => b.type === "tool_use");
  if (!tu || tu.type !== "tool_use") throw new Error("Claude program üretimi boş döndü.");
  return tu.input as AIProgram;
}

export function aiConfigured(): boolean {
  return process.env.PARSE_PROVIDER === "claude" && !!process.env.ANTHROPIC_API_KEY;
}
