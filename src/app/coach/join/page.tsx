"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

export default function CoachJoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/coach/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(`/coach/${data.clientId}`);
    } else {
      setError(data.error ?? "Bağlanılamadı.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold tracking-tight">Koç Girişi</h1>
      <p className="mt-1 text-sm text-ink-3">Danışanının verdiği davet kodunu girerek ona bağlan.</p>

      <div className="card mt-5 p-5">
        <label className="block">
          <span className="label">Davet kodu</span>
          <input
            className="input font-mono tracking-[0.2em]"
            placeholder="ÖRN: 3F9A2C7B10"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && join()}
            autoFocus
          />
        </label>
        {error && <div className="mt-3 rounded-lg border border-crit/30 bg-crit-wash px-3 py-2 text-sm text-crit">{error}</div>}
        <button className="btn btn-primary mt-4" onClick={join} disabled={busy || !code.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Danışana bağlan
        </button>
      </div>
    </div>
  );
}
