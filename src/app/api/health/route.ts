import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Liveness/readiness probe for managed hosts (Fly.io, Railway) and uptime
// monitors. Returns 200 when the app can reach the database, 503 otherwise.
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "up",
      latencyMs: Date.now() - startedAt,
      version: process.env.APP_VERSION ?? "dev",
      time: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "degraded",
        db: "down",
        error: err instanceof Error ? err.message : "unknown",
        time: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
