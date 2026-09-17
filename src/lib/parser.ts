// Provider dispatch for document parsing.
// PARSE_PROVIDER="claude" + ANTHROPIC_API_KEY + file bytes → real Claude Vision.
// PARSE_PROVIDER="mock" (or Claude not configured) → deterministic mock. Keeps the
// POC runnable with no key while making the real path a one-env-var switch.
//
// Data-integrity note: when Claude IS configured, a parse failure is propagated
// (thrown) rather than silently swapped for mock data — a health app must never
// present fabricated biomarker values as if they were read from the user's file.

import { mockParseLab, mockParseInbody, type ParsedLab, type ParsedInbody } from "@/lib/mock-parser";

export type ParseKind = "lab_pdf" | "inbody_img";

export interface ParseResult {
  parsed: ParsedLab | ParsedInbody;
  provider: "mock" | "claude";
}

export class ParseError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "ParseError";
  }
}

export async function parseDocument(
  kind: ParseKind,
  file: { data?: string; mime?: string },
): Promise<ParseResult> {
  const provider = process.env.PARSE_PROVIDER ?? "mock";
  const claudeConfigured = provider === "claude" && !!process.env.ANTHROPIC_API_KEY;

  if (claudeConfigured) {
    if (!file.data) {
      throw new ParseError("Dosya içeriği alınamadı — lütfen dosyayı tekrar yükleyin.");
    }
    try {
      const { parseLabWithClaude, parseInbodyWithClaude } = await import("@/lib/claude-parser");
      const parsed =
        kind === "lab_pdf"
          ? await parseLabWithClaude(file.data)
          : await parseInbodyWithClaude(file.data, file.mime ?? "image/png");
      return { parsed, provider: "claude" };
    } catch (err) {
      // Do NOT fall back to mock here — surface the failure to the caller.
      console.error("[parser] Claude parse failed:", err);
      throw new ParseError("AI okuma başarısız oldu. Dosyanın net bir kan tahlili/InBody belgesi olduğundan emin olup tekrar deneyin.", err);
    }
  }

  return {
    parsed: kind === "lab_pdf" ? mockParseLab() : mockParseInbody(),
    provider: "mock",
  };
}
