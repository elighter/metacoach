// Koç / PT modülü yardımcıları (hafif MVP).
// Danışan bir koçu davet koduyla bağlar; hangi modülleri göreceğini kendi seçer.
// Erişim her zaman aktif CoachLink + izin listesine göre doğrulanır.

import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export const COACH_MODULES = [
  { id: "activity", label: "Aktivite (Apple Health)" },
  { id: "workout", label: "Antrenman" },
  { id: "nutrition", label: "Beslenme" },
  { id: "biometrics", label: "Biyometri" },
  { id: "metabolism", label: "Metabolizma / TDEE" },
  { id: "assessment", label: "Ön Değerlendirme" },
] as const;

export type CoachModule = (typeof COACH_MODULES)[number]["id"];
const MODULE_IDS = COACH_MODULES.map((m) => m.id) as readonly string[];

export function parsePermissions(json: string | null | undefined): CoachModule[] {
  try {
    const arr = JSON.parse(json ?? "[]");
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is CoachModule => typeof x === "string" && MODULE_IDS.includes(x));
  } catch {
    return [];
  }
}

export function serializePermissions(mods: string[]): string {
  return JSON.stringify(mods.filter((m) => MODULE_IDS.includes(m)));
}

/**
 * Danışanın davet kodunu getirir/oluşturur ve önden seçilen izinleri kaydeder.
 * Kod korunur (link sabit kalsın); yalnızca izinler güncellenir.
 */
export async function upsertInvite(clientId: string, permissions: string[]): Promise<string> {
  const perms = serializePermissions(permissions);
  const existing = await prisma.coachInvite.findUnique({ where: { clientId } });
  if (existing) {
    await prisma.coachInvite.update({ where: { clientId }, data: { permissions: perms } });
    return existing.code;
  }
  const code = randomBytes(6).toString("base64url"); // ~8 karakter, URL-güvenli
  const created = await prisma.coachInvite.create({ data: { clientId, code, permissions: perms } });
  return created.code;
}

/** Danışan tarafı: bağlı koç + izinler + davet kodu/önden seçili izinler. */
export async function getClientCoachInfo(clientId: string) {
  const [link, invite] = await Promise.all([
    prisma.coachLink.findFirst({
      where: { clientId, status: "active" },
      include: { coach: { select: { id: true, name: true, email: true } } },
    }),
    prisma.coachInvite.findUnique({ where: { clientId } }),
  ]);
  return {
    coach: link?.coach ?? null,
    permissions: link ? parsePermissions(link.permissions) : [],
    linkId: link?.id ?? null,
    inviteCode: invite?.code ?? null,
    invitePermissions: invite ? parsePermissions(invite.permissions) : [],
  };
}

/** Koç tarafı: aktif danışanlar. */
export async function getCoachClients(coachId: string) {
  const links = await prisma.coachLink.findMany({
    where: { coachId, status: "active" },
    include: { client: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return links.map((l) => ({
    linkId: l.id,
    client: l.client,
    permissions: parsePermissions(l.permissions),
  }));
}

/** Koçun bir danışana erişimini doğrular (aktif link). Yoksa null. */
export async function getCoachAccess(coachId: string, clientId: string) {
  const link = await prisma.coachLink.findFirst({
    where: { coachId, clientId, status: "active" },
    include: { client: { select: { id: true, name: true, email: true } } },
  });
  if (!link) return null;
  return { link, permissions: parsePermissions(link.permissions), client: link.client };
}

export function canSee(permissions: CoachModule[], mod: CoachModule): boolean {
  return permissions.includes(mod);
}
