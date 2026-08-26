"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Copy, Check, UserPlus, Link2Off, ShieldCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoachInfo {
  name: string;
  email: string;
}

export function CoachAccessCard({
  initialInviteCode,
  coach,
  initialPermissions,
  modules,
}: {
  initialInviteCode: string | null;
  coach: CoachInfo | null;
  initialPermissions: string[];
  modules: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialInviteCode);
  const [perms, setPerms] = useState<string[]>(initialPermissions);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/coach/invite", { method: "POST" });
      if (res.ok) setCode((await res.json()).code);
    } finally {
      setBusy(false);
    }
  }

  async function togglePerm(id: string) {
    const next = perms.includes(id) ? perms.filter((p) => p !== id) : [...perms, id];
    setPerms(next);
    await fetch("/api/coach/permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: next }),
    });
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
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* pano yoksa geç */
    }
  }

  return (
    <div className="card p-5">
      <div className="kicker mb-3">Koç erişimi</div>

      {coach ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-wash text-sm font-bold text-primary-ink">
              {coach.name.trim()[0]?.toUpperCase() ?? "?"}
            </span>
            <div>
              <div className="text-sm font-semibold">{coach.name}</div>
              <div className="text-xs text-ink-3">{coach.email} · bağlı koç</div>
            </div>
          </div>

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
                    <span className={cn("h-4 w-4 rounded-full border", on ? "border-primary bg-primary" : "border-border-strong")}>
                      {on && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-3">Kapalı modüllerin verisi koça gösterilmez. Değişiklik anında kaydedilir.</p>
          </div>

          <div>
            <button className="btn border-crit/30 text-crit hover:bg-crit-wash" onClick={revoke} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2Off className="h-4 w-4" />}
              Bağlantıyı kaldır
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-3">
            Antrenörünle çalışıyorsan, aşağıdaki davet kodunu ona ver. Koç uygulamada <b className="text-ink">Koç Girişi</b>'nden bu kodu girerek
            sana bağlanır; hangi modülleri göreceğini sen belirlersin.
          </p>
          {code ? (
            <label className="block">
              <span className="label">Davet kodu</span>
              <div className="flex gap-2">
                <input readOnly value={code} className="input font-mono tracking-[0.2em]" onFocus={(e) => e.currentTarget.select()} />
                <button className="btn shrink-0 px-3" onClick={copy} aria-label="Kopyala">
                  {copied ? <Check className="h-4 w-4 text-good" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </label>
          ) : (
            <button className="btn btn-primary self-start" onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Davet kodu oluştur
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-xs text-ink-3">Kendin bir danışanın koçu musun?</span>
        <Link href="/coach/join" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-ink hover:underline">
          Koç girişi (kod gir) <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
