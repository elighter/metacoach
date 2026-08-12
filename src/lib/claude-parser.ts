// ─────────────────────────────────────────────────────────────
// Real document parsing with Claude Vision (PARSE_PROVIDER="claude").
// Uses a single forced tool call (strict) against claude-opus-5 to extract
// structured lab / InBody data. Requires ANTHROPIC_API_KEY.
// Falls back to mock via src/lib/parser.ts.
// ─────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import type { ParsedLab, ParsedInbody } from "@/lib/mock-parser";

const MODEL = "claude-opus-5";

const labSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    panelName: { type: "string", description: "Panel/test adı" },
    labName: { type: "string", description: "Laboratuvar adı" },
    collectedAt: { type: "string", description: "Numune alım tarihi ISO 8601 (YYYY-MM-DD)" },
    confidence: { type: "number", description: "Genel okuma güveni 0-1" },
    biomarkers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          code: { type: "string", description: "Kısa kod, ör. LDL" },
          name: { type: "string", description: "Türkçe tam ad" },
          value: { type: "number" },
          unit: { type: "string" },
          refLow: { anyOf: [{ type: "number" }, { type: "null" }] },
          refHigh: { anyOf: [{ type: "number" }, { type: "null" }] },
          flag: { type: "string", enum: ["low", "normal", "high"] },
          confidence: { type: "number" },
        },
        required: ["code", "name", "value", "unit", "refLow", "refHigh", "flag", "confidence"],
      },
    },
  },
  required: ["panelName", "labName", "collectedAt", "confidence", "biomarkers"],
};

const inbodySchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    confidence: { type: "number" },
    weightKg: { type: "number" },
    bodyFatPct: { type: "number" },
    skeletalMuscleKg: { type: "number" },
    visceralFat: { type: "number" },
    bodyWaterPct: { type: "number" },
    bmrDevice: { type: "number", description: "Cihazın gösterdiği BMR (kcal)" },
    impedance: { type: "number", description: "İmpedans (ohm); yoksa 0" },
  },
  required: [
    "confidence", "weightKg", "bodyFatPct", "skeletalMuscleKg",
    "visceralFat", "bodyWaterPct", "bmrDevice", "impedance",
  ],
};

const LAB_PROMPT = `Bu bir kan tahlili raporudur. Tüm biyobelirteçleri eksiksiz çıkar ve record_lab aracını çağır.
Her değer için referans aralığına göre flag belirle (değer < refLow → low, > refHigh → high, aksi → normal).
Türkçe adları koru; okuyamadığın alanlar için düşük confidence ver.`;

const INBODY_PROMPT = `Bu bir InBody / vücut kompozisyon analiz görselidir. Ağırlık, vücut yağ %, iskelet kas kütlesi,
visseral yağ, vücut suyu % ve BMR değerlerini çıkar ve record_inbody aracını çağır. İmpedans yoksa 0 ver.`;

function anthropic() {
  return new Anthropic(); // reads ANTHROPIC_API_KEY from env
}

export async function parseLabWithClaude(dataBase64: string): Promise<ParsedLab> {
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 8000,
    tools: [{ name: "record_lab", description: "Kan tahlili sonucunu kaydet", input_schema: labSchema, strict: true } as Anthropic.Tool],
    tool_choice: { type: "tool", name: "record_lab" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: dataBase64 },
          },
          { type: "text", text: LAB_PROMPT },
        ],
      },
    ],
  });
  const tu = res.content.find((b) => b.type === "tool_use");
  if (!tu || tu.type !== "tool_use") throw new Error("Claude çıkarımı boş döndü.");
  return tu.input as ParsedLab;
}

export async function parseInbodyWithClaude(
  dataBase64: string,
  mime: string,
): Promise<ParsedInbody> {
  const mediaType = (["image/png", "image/jpeg", "image/gif", "image/webp"].includes(mime)
    ? mime
    : "image/png") as "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 2000,
    tools: [{ name: "record_inbody", description: "InBody sonucunu kaydet", input_schema: inbodySchema, strict: true } as Anthropic.Tool],
    tool_choice: { type: "tool", name: "record_inbody" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: dataBase64 } },
          { type: "text", text: INBODY_PROMPT },
        ],
      },
    ],
  });
  const tu = res.content.find((b) => b.type === "tool_use");
  if (!tu || tu.type !== "tool_use") throw new Error("Claude çıkarımı boş döndü.");
  return tu.input as ParsedInbody;
}
