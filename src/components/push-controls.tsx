"use client";

import { useEffect, useState } from "react";
import { BellRing, Send, Loader2, Check } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type Perm = "unknown" | "unsupported" | "denied" | "default" | "granted";

export function PushControls() {
  const [perm, setPerm] = useState<Perm>("unknown");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission as Perm);
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const result = await Notification.requestPermission();
      setPerm(result as Perm);
      if (result !== "granted") {
        setMsg("Bildirim izni verilmedi.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setMsg("VAPID anahtarı yapılandırılmamış.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setMsg("Bildirimler etkinleştirildi ✓");
    } catch (e) {
      setMsg("Etkinleştirilemedi: " + (e instanceof Error ? e.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/push/test", { method: "POST" });
    const d = await res.json();
    setMsg(res.ok ? `Test bildirimi gönderildi (${d.sent}).` : d.error ?? "Gönderilemedi.");
    setBusy(false);
  }

  if (perm === "unsupported") {
    return (
      <p className="text-xs text-ink-3">
        Bu tarayıcı web push desteklemiyor. iOS'ta uygulamayı ana ekrana ekleyince çalışır.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={enable} disabled={busy || perm === "granted"}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : perm === "granted" ? <Check className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
          {perm === "granted" ? "Bildirimler açık" : "Bildirimleri etkinleştir"}
        </button>
        <button className="btn" onClick={sendTest} disabled={busy || perm !== "granted"}>
          <Send className="h-4 w-4" /> Test bildirimi gönder
        </button>
      </div>
      {msg && <p className="text-xs text-ink-2">{msg}</p>}
      {perm === "denied" && (
        <p className="text-xs text-warn">Bildirimler tarayıcı ayarlarından engellenmiş.</p>
      )}
    </div>
  );
}
