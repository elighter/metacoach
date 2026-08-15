import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/db";

export async function POST(req: Request) {
  await getCurrentUser();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Görsel dosya gerekli." }, { status: 400 });
  }

  const provider = process.env.PARSE_PROVIDER ?? "mock";
  const claudeConfigured = provider === "claude" && !!process.env.ANTHROPIC_API_KEY;

  if (claudeConfigured) {
    try {
      const { parseMealWithClaude } = await import("@/lib/claude-parser");
      const buf = Buffer.from(await file.arrayBuffer());
      const result = await parseMealWithClaude(buf.toString("base64"), file.type);
      return NextResponse.json({ ok: true, provider: "claude", ...result });
    } catch (err) {
      console.error("[meal-parse] Claude failed:", err);
      return NextResponse.json(
        { error: "AI yemek analizi başarısız oldu. Lütfen net bir tabak fotoğrafı ile tekrar deneyin." },
        { status: 422 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    provider: "mock",
    confidence: 0.85,
    items: [
      { name: "Izgara tavuk göğüs", portionG: 150, kcal: 248, proteinG: 46, carbG: 0, fatG: 5.4, confidence: 0.9 },
      { name: "Pilav", portionG: 200, kcal: 260, proteinG: 5, carbG: 57, fatG: 0.6, confidence: 0.85 },
      { name: "Mevsim salatası", portionG: 120, kcal: 35, proteinG: 1.5, carbG: 6, fatG: 0.5, confidence: 0.8 },
    ],
  });
}
