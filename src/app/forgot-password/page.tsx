"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Loader2, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-ink shadow-card">
            <Activity className="h-6 w-6 text-white" strokeWidth={2.4} />
          </span>
          <div>
            <div className="text-xl font-bold tracking-tight">MetaCoach</div>
            <div className="text-sm text-ink-3">Şifre sıfırlama</div>
          </div>
        </div>

        <div className="card flex flex-col gap-4 p-6">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle className="h-10 w-10 text-ok" />
              <h1 className="text-lg font-semibold">E-posta gönderildi</h1>
              <p className="text-sm text-ink-3">
                Eğer bu e-posta ile bir hesap varsa, şifre sıfırlama bağlantısı gönderildi. Lütfen gelen kutunu kontrol et.
              </p>
              <Link href="/login" className="btn btn-primary mt-2 w-full text-center">
                Giriş sayfasına dön
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <h1 className="text-lg font-semibold">Şifremi unuttum</h1>
              <p className="text-sm text-ink-3">E-posta adresini gir, sana şifre sıfırlama bağlantısı gönderelim.</p>
              <label className="block">
                <span className="label">E-posta</span>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </label>
              {error && <div className="rounded-lg bg-crit-wash px-3 py-2 text-sm text-crit">{error}</div>}
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sıfırlama bağlantısı gönder
              </button>
              <p className="text-center text-sm text-ink-3">
                <Link href="/login" className="font-medium text-primary-ink hover:underline">Giriş sayfasına dön</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
