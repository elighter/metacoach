import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeHealthPayload, applyHealthImport } from "@/lib/health-import";
import { maybeCalibrateActivity } from "@/lib/activity-calibration";

// Session'sız cihaz webhook'u (iOS "Health Auto Export" / Apple Kısayol).
// Kimlik: Authorization: Bearer <token>  veya  ?token=<token>.
// Bu yol auth.config PUBLIC_PREFIXES içinde — koruma burada token ile yapılır.
export const dynamic = "force-dynamic";

// Yaygın yapıştırma hatalarına toleranslı: sarmalayan boşluk, tırnak ve
// talimattaki "<token>" yer-tutucu köşeli parantezlerini kırpar.
function cleanToken(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim().replace(/^[<"']+|[>"']+$/g, "").trim();
  return t.length ? t : null;
}

function extractToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return cleanToken(auth.slice(7));
  const url = new URL(req.url);
  return cleanToken(url.searchParams.get("token"));
}

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) {
    return NextResponse.json({ error: "Token gerekli." }, { status: 401 });
  }

  const record = await prisma.healthIngestToken.findUnique({ where: { token } });
  if (!record) {
    return NextResponse.json({ error: "Geçersiz token." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON gövdesi." }, { status: 400 });
  }

  const normalized = normalizeHealthPayload(payload);
  if (normalized.days.length === 0 && normalized.workouts.length === 0) {
    return NextResponse.json(
      { error: "Tanınan aktivite verisi bulunamadı (aktif kalori, adım veya antrenman)." },
      { status: 422 },
    );
  }

  const result = await applyHealthImport(record.userId, normalized);
  await prisma.healthIngestToken.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });
  const calibration = await maybeCalibrateActivity(record.userId);

  return NextResponse.json({ ok: true, source: normalized.source, ...result, calibration });
}
