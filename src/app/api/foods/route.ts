import { NextResponse } from "next/server";
import { getCurrentUser, prisma } from "@/lib/db";
import { BUILTIN_FOODS } from "@/lib/foods-builtin";

export async function GET(req: Request) {
  await getCurrentUser();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ foods: [] });

  const dbFoods = await prisma.foodItem.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    take: 12,
    orderBy: { name: "asc" },
  });

  if (dbFoods.length >= 6) return NextResponse.json({ foods: dbFoods });

  const lower = q.toLowerCase();
  const builtinMatches = BUILTIN_FOODS
    .filter((f) => f.name.toLowerCase().includes(lower))
    .filter((f) => !dbFoods.some((d) => d.name === f.name))
    .slice(0, 12 - dbFoods.length);

  return NextResponse.json({ foods: [...dbFoods, ...builtinMatches] });
}
