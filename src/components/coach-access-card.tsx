"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Copy, Check, Link2, Link2Off, ShieldCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoachInfo {
  name: string;
  email: string;
}

export function CoachAccessCard({
  linkedCoach,
  initialLinkPermissions,
  initialInvitePermissions,
  initialInviteCode,
  modules,
}: {
  linkedCoach: CoachInfo | null;
  initialLinkPermissions: string[];
  initialInvitePermissions: string[];
  initialInviteCode: string | null;
  modules: { id: string; label: string }[];
}) {
  const router = useRouter();
  const linked = !!linkedCoach;
  const [perms, setPerms] = useState<string[]>(linked ? initialLinkPermissions : initialInvitePermissions);
  const [code, setCode] = useState(initialInviteCode);
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);
  const inviteUrl = code ? `${origin || ""}/coach/accept/${code}` : null;

  // Modül seçimini kaydet: bağlıysa canlı izin; değilse davet izinleri.
  async function togglePerm(id: string) {
    const next = perms.includes(id) ? perms.filter((p) => p !== id) : [...perms, id];
    setPerms(next);
    const endpoint = linked ? "/api/coach/permissions" : "/api/coach/invite";
    const method = linked ? "PATCH" : "POST";
    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: next }),
    });
    if (!linked && res.ok) setCode((await res.json()).code);
  }

  async function createLink() {
    setBusy(true);
    try {
      const res = await fetch("/api/coach/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: perms }),
      });
      if (res.ok) setCode((await res.json()).code);
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!confirm("Koç bağlantısını kaldırmak istediğine emin misin?")) return;
    setBusy(true);
    try {
      await fetch("/api/coach/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revoke: true }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* pano yoksa geç */
    }
  }

  const ModuleToggles = (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-2">
        <ShieldCheck className="h-4 w-4 text-good" /> Koçun görebileceği modüller
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {modules.map((m) => {
          const on = perms.includes(m.id);
          return (
            <button
              key={m.id}
              onClick={() => togglePerm(m.id)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                on ? "border-primary/40 bg-primary-wash text-primary-ink" : "border-border bg-surface-2 text-ink-2 hover:text-ink",
              )}
            >
              <span>{m.label}</span>
              <span className={cn("grid h-4 w-4 place-items-center rounded-full border", on ? "border-primary bg-primary" : "border-border-strong")}>
                {on && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-3">Kapalı modüllerin verisi koça gösterilmez. Değişiklik anında kaydedilir.</p>
    </div>
  );

  return (
    <div className="card p-5">
      <div className="kicker mb-3">Koç erişimi</div>

      {linked ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-wash text-sm font-bold text-primary-ink">
              {linkedCoach!.name.trim()[0]?.toUpperCase() ?? "?"}
            </span>
            <div>
              <div className="text-sm font-semibold">{linkedCoach!.name}</div>
              <div className="text-xs text-ink-3">{linkedCoach!.email} · bağlı koç</div>
            </div>
          </div>
          {ModuleToggles}
          <div>
            <button className="btn border-crit/30 text-crit hover:bg-crit-wash" onClick={revoke} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2Off className="h-4 w-4" />}
              Bağlantıyı kaldır
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-3">
            Antrenörünle çalışıyorsan: <b className="text-ink">önce koçun göreceği modülleri seç</b>, sonra davet linkini oluştur ve koçuna gönder.
            Koç linke tıklayıp giriş yapınca otomatik bağlanır — seçtiğin izinlerle.
          </p>
          {ModuleToggles}
          {inviteUrl ? (
            <label className="block">
              <span className="label">Davet linki</span>
              <div className="flex gap-2">
                <input readOnly value={inviteUrl} className="input text-xs" onFocus={(e) => e.currentTarget.select()} />
                <button className="btn shrink-0 px-3" onClick={copy} aria-label="Kopyala">
                  {copied ? <Check className="h-4 w-4 text-good" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-ink-3">Linki koçuna gönder (WhatsApp, e-posta…). İzinleri değiştirirsen link aynı kalır, yeni izinlerle geçerli olur.</p>
            </label>
          ) : (
            <button className="btn btn-primary self-start" onClick={createLink} disabled={busy || perms.length === 0}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Davet linki oluştur
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-ink-3">Kendin bir danışanın koçu musun?</span>
          <Link href="/coach/join" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-ink hover:underline">
            Koç girişi (kod gir) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-ink-3">Koç deneyimini denemek ister misin?</span>
          <Link href="/coach/preview" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-ink hover:underline">
            Koç önizleme (kaydetmez) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
