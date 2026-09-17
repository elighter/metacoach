"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, XCircle } from "lucide-react";

// Davet linki: giriş yapmış koç bu sayfaya düşünce otomatik bağlanır.
// (Giriş yoksa middleware login'e yollar, callbackUrl ile buraya geri döner.)
export default function CoachAcceptPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [state, setState] = useState<"joining" | "error">("joining");
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const res = await fetch("/api/coach/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: params.code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.replace(`/coach/${data.clientId}`);
      } else {
        setError(data.error ?? "Bağlanılamadı.");
        setState("error");
      }
    })();
  }, [params.code, router]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center">
      <div className="card p-8 text-center">
        {state === "joining" ? (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-ink-2">Danışana bağlanıyorsun…</p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-8 w-8 text-crit" />
            <p className="mt-3 text-sm font-medium text-ink">{error}</p>
            <p className="mt-1 text-xs text-ink-3">Davet linki geçersiz ya da süresi dolmuş olabilir. Danışandan yeni bir link iste.</p>
            <Link href="/coach" className="btn mt-4 inline-flex">Koçluk sayfası</Link>
          </>
        )}
      </div>
    </div>
  );
}
