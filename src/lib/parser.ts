// Provider dispatch for document parsing.
// PARSE_PROVIDER="claude" + ANTHROPIC_API_KEY + file bytes → real Claude Vision.
// Anything else (or on error) → deterministic mock. Keeps the POC runnable
// with no key while making the real path a one-env-var switch.

import { mockParseLab, mockParseInbody, type ParsedLab, type ParsedInbody } from "@/lib/mock-parser";

export type ParseKind = "lab_pdf" | "inbody_img";

export interface ParseResult {
  parsed: ParsedLab | ParsedInbody;
  provider: "mock" | "claude";
}

export async function parseDocument(
  kind: ParseKind,
  file: { data?: string; mime?: string },
): Promise<ParseResult> {
  const provider = process.env.PARSE_PROVIDER ?? "mock";
  const canUseClaude = provider === "claude" && !!process.env.ANTHROPIC_API_KEY && !!file.data;

  if (canUseClaude) {
    try {
      const { parseLabWithClaude, parseInbodyWithClaude } = await import("@/lib/claude-parser");
      const parsed =
        kind === "lab_pdf"
          ? await parseLabWithClaude(file.data as string)
          : await parseInbodyWithClaude(file.data as string, file.mime ?? "image/png");
      return { parsed, provider: "claude" };
    } catch (err) {
      console.error("[parser] Claude parse failed, falling back to mock:", err);
    }
  }

  return {
    parsed: kind === "lab_pdf" ? mockParseLab() : mockParseInbody(),
    provider: "mock",
  };
}
