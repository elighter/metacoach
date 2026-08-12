"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Activity, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBusy(false);
      setError(data.error ?? "Kayıt başarısız.");
      return;
    }
    await signIn("credentials", { email, password, redirect: false });
    router.push("/");
    router.refresh();
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
            <div className="text-sm text-ink-3">Hesap oluştur</div>
          </div>
        </div>

        <form onSubmit={submit} className="card flex flex-col gap-4 p-6">
          <h1 className="text-lg font-semibold">Kayıt ol</h1>
          <label className="block">
            <span className="label">Ad Soyad</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </label>
          <label className="block">
            <span className="label">E-posta</span>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label className="block">
            <span className="label">Şifre</span>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" placeholder="En az 8 karakter" />
          </label>
          {error && <div className="rounded-lg bg-crit-wash px-3 py-2 text-sm text-crit">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Hesap oluştur
          </button>
          <p className="text-center text-sm text-ink-3">
            Zaten hesabın var mı?{" "}
            <Link href="/login" className="font-medium text-primary-ink hover:underline">Giriş yap</Link>
          </p>
        </form>
        <p className="mt-4 text-center text-xs text-ink-3">
          Kayıt olarak KVKK aydınlatma metnini ve sağlık verisi işleme rızasını kabul edersin.
        </p>
      </div>
    </div>
  );
}
