import { PrismaClient } from "@prisma/client";

// Prisma singleton — avoids exhausting connections during Next.js hot reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Resolve the authenticated user from the Auth.js session.
 * `auth` is imported dynamically to avoid a circular import (auth.ts → db.ts).
 * Routes/pages are gated by middleware, so an unauthenticated call is an error.
 */
export async function getCurrentUser() {
  const { auth } = await import("@/auth");
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("UNAUTHENTICATED");
  const user = await prisma.user.findUnique({
    where: { email },
    include: { settings: true, dashboardLayout: true },
  });
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
