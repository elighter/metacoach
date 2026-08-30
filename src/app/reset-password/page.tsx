"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Activity, Loader2, CheckCircle } from "lucide-react";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <p className="text-sm text-crit">Geçersiz veya eksik sıfırlama bağlantısı.</p>
        <Link href="/forgot-password" className="btn btn-primary mt-2 w-full text-center">
          Yeni bağlantı iste
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Bir hata oluştu.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle className="h-10 w-10 text-ok" />
        <h1 className="text-lg font-semibold">Şifre güncellendi</h1>
        <p className="text-sm text-ink-3">Yeni şifrenle giriş yapabilirsin.</p>
        <Link href="/login" className="btn btn-primary mt-2 w-full text-center">
          Giriş yap
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Yeni şifre belirle</h1>
      <label className="block">
        <span className="label">Yeni şifre</span>
        <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" placeholder="En az 8 karakter" />
      </label>
      <label className="block">
        <span className="label">Şifre tekrar</span>
        <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" placeholder="Tekrar gir" />
      </label>
      {error && <div className="rounded-lg bg-crit-wash px-3 py-2 text-sm text-crit">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Şifreyi güncelle
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
          <Suspense fallback={<Loader2 className="mx-auto h-6 w-6 animate-spin text-ink-3" />}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
