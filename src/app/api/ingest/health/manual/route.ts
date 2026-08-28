import { NextResponse } from "next/server";
import { getCurrentUser, prisma } from "@/lib/db";
import { normalizeHealthPayload, applyHealthImport } from "@/lib/health-import";
import { maybeCalibrateActivity } from "@/lib/activity-calibration";

export async function POST(req: Request) {
  const user = await getCurrentUser();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 });
  }

  const normalized = normalizeHealthPayload(payload);
  if (normalized.days.length === 0 && normalized.workouts.length === 0) {
    return NextResponse.json(
      { error: "Tanınan aktivite verisi bulunamadı." },
      { status: 422 },
    );
  }

  const result = await applyHealthImport(user.id, normalized);
  const calibration = await maybeCalibrateActivity(user.id);

  return NextResponse.json({ ok: true, source: normalized.source, ...result, calibration });
}
