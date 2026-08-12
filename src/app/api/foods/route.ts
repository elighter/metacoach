import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const foods = await prisma.foodItem.findMany({
    where: q ? { name: { contains: q } } : undefined,
    take: 12,
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ foods });
}
