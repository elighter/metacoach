import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Liveness/readiness probe for uptime monitors and platform health checks.
// Returns 200 when the app can reach the database, 503 otherwise.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        db: "up",
        uptimeSec: Math.round(process.uptime()),
        latencyMs: Date.now() - startedAt,
        version: process.env.npm_package_version ?? "0.1.0",
        time: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "degraded",
        db: "down",
        error: err instanceof Error ? err.message : "unknown",
        time: new Date().toISOString(),
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
