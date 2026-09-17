import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db";
import { getCoachClients, COACH_MODULES } from "@/lib/coach";
import { ChevronRight, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const MODULE_LABEL = Object.fromEntries(COACH_MODULES.map((m) => [m.id, m.label]));

export default async function CoachPage() {
  const user = await getCurrentUser();
  const clients = await getCoachClients(user.id);
  // Tek danışan varsa doğrudan onun paneline düş.
  if (clients.length === 1) redirect(`/coach/${clients[0].client.id}`);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Koçluk</h1>
      <p className="mt-1 text-sm text-ink-3">Danışanların ve sana açtıkları modüller.</p>

      {clients.length === 0 ? (
        <div className="card mt-5 p-6 text-center">
          <Users className="mx-auto h-8 w-8 text-ink-3" />
          <p className="mt-2 text-sm text-ink-2">Henüz bağlı danışanın yok.</p>
          <p className="mt-1 text-xs text-ink-3">
            Danışanın <b>Ayarlar → Koç erişimi</b>'nden bir davet kodu üretip sana versin; sonra <b>Koç Girişi</b>'nden kodu gir.
          </p>
          <Link href="/coach/join" className="btn btn-primary mt-4 inline-flex">Koç girişi (kod gir)</Link>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-2.5">
          {clients.map((c) => (
            <Link key={c.linkId} href={`/coach/${c.client.id}`} className="card flex items-center justify-between gap-3 p-4 hover:bg-surface-2">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-wash text-sm font-bold text-primary-ink">
                  {c.client.name.trim()[0]?.toUpperCase() ?? "?"}
                </span>
                <div>
                  <div className="text-sm font-semibold">{c.client.name}</div>
                  <div className="text-xs text-ink-3">
                    {c.permissions.length ? c.permissions.map((p) => MODULE_LABEL[p]).join(" · ") : "Henüz modül paylaşılmadı"}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-3" />
            </Link>
          ))}
          <Link href="/coach/join" className="btn mt-2 self-start">Yeni danışan ekle (kod gir)</Link>
        </div>
      )}
    </div>
  );
}
