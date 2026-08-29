"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Activity, Loader2 } from "lucide-react";

/** Site içi callbackUrl'e izin ver (göreli path VEYA aynı-origin tam URL). */
function safeCallback(): string {
  if (typeof window === "undefined") return "/";
  const raw = new URLSearchParams(window.location.search).get("callbackUrl");
  if (!raw) return "/";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const u = new URL(raw, window.location.origin);
    if (u.origin === window.location.origin) return u.pathname + u.search;
  } catch {
    /* geçersiz URL */
  }
  return "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cb, setCb] = useState("/");

  useEffect(() => {
    const c = safeCallback();
    setCb(c);
    if (c.startsWith("/coach")) setEmail(""); // koç kendi hesabıyla girsin (demo e-postasını temizle)
  }, []);
  const isCoachFlow = cb.startsWith("/coach");
  const registerHref = cb === "/" ? "/register" : `/register?callbackUrl=${encodeURIComponent(cb)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError("E-posta veya şifre hatalı.");
    } else {
      router.push(cb);
      router.refresh();
    }
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
            <div className="text-sm text-ink-3">Adaptif sağlık &amp; beslenme</div>
          </div>
        </div>

        {isCoachFlow && (
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary-wash px-3 py-2 text-center text-sm text-primary-ink">
            Koç olarak bağlanmak için giriş yap ya da yeni hesap oluştur.
          </div>
        )}
        <form onSubmit={submit} className="card flex flex-col gap-4 p-6">
          <h1 className="text-lg font-semibold">Giriş yap</h1>
          <label className="block">
            <span className="label">E-posta</span>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label className="block">
            <span className="label">Şifre</span>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" />
          </label>
          {error && <div className="rounded-lg bg-crit-wash px-3 py-2 text-sm text-crit">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Giriş yap
          </button>
          <p className="text-center text-sm text-ink-3">
            Hesabın yok mu?{" "}
            <Link href={registerHref} className="font-medium text-primary-ink hover:underline">Kayıt ol</Link>
          </p>
        </form>

      </div>
    </div>
  );
}
