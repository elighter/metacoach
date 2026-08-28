"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bluetooth, Loader2, Play, CheckCircle2, Wifi } from "lucide-react";
import {
  simulateMiScaleReading,
  parseMiScalePayload,
  MI_SCALE_BLE,
  type MiComposition,
} from "@/lib/mi-scale";
import { fmt, fmtDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function MiScalePanel({
  latestWeight,
  connected,
  lastSyncAt,
}: {
  latestWeight: number;
  connected: boolean;
  lastSyncAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "sim" | "ble">(null);
  const [result, setResult] = useState<MiComposition | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(weightKg: number, impedance: number, source: "ble" | "simulated", measuredAt?: string | null) {
    const res = await fetch("/api/mi-scale/reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weightKg, impedance, source, ...(measuredAt && { measuredAt }) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Ölçüm kaydedilemedi");
    setResult(data.composition);
    router.refresh();
  }

  async function simulate() {
    setError(null);
    setBusy("sim");
    try {
      await new Promise((r) => setTimeout(r, 900)); // stepping-on-the-scale feel
      const r = simulateMiScaleReading(latestWeight);
      await post(r.weightKg, r.impedance, "simulated");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function connectBle() {
    setError(null);
    const nav = navigator as any;
    if (!nav.bluetooth) {
      setError("Bu tarayıcı Web Bluetooth desteklemiyor (iOS Safari desteklemez). Simülatörü kullanabilir ya da Apple Health üzerinden senkronize edebilirsin.");
      return;
    }
    setBusy("ble");
    try {
      const device = await nav.bluetooth.requestDevice({
        filters: [{ services: [MI_SCALE_BLE.bodyCompositionService] }],
        optionalServices: [MI_SCALE_BLE.weightScaleService],
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(MI_SCALE_BLE.bodyCompositionService);
      const ch = await service.getCharacteristic(MI_SCALE_BLE.bodyCompositionMeasurement);

      const reading = await new Promise<{ weightKg: number; impedance: number; measuredAt: string | null }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          ch.stopNotifications().catch(() => {});
          reject(new Error("60 saniye içinde ölçüm alınamadı. Tartıya çıplak ayakla çıkıp impedans ölçümünün (ekranda yükleme çubuğu) bitmesini bekleyin."));
        }, 60_000);

        ch.addEventListener("characteristicvaluechanged", (e: Event) => {
          const target = e.target as any;
          const value = target.value as DataView | undefined;
          if (!value) return;
          const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
          const parsed = parseMiScalePayload(bytes);
          if (!parsed) return;
          if (parsed.stabilized && parsed.impedanceReady && parsed.impedance) {
            clearTimeout(timeout);
            ch.stopNotifications().catch(() => {});
            server.disconnect();
            resolve({
              weightKg: parsed.weightKg,
              impedance: parsed.impedance,
              measuredAt: parsed.measuredAt?.toISOString() ?? null,
            });
          }
        });
        ch.startNotifications().catch((err: Error) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      await post(reading.weightKg, reading.impedance, "ble", reading.measuredAt);
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("cancelled") || msg.includes("canceled") || msg.includes("User cancelled")) {
        setError(null);
      } else {
        setError(msg || "Bluetooth bağlantısı başarısız.");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-wash text-primary-ink">
            <Bluetooth className="h-5 w-5" />
          </span>
          <div>
            <div className="font-semibold">Mi Body Composition Scale 2</div>
            <div className="flex items-center gap-1.5 text-xs text-ink-3">
              <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-good" : "bg-ink-3")} />
              {connected ? "Bağlı" : "Bağlı değil"}
              {lastSyncAt && <> · son senk. {fmtDate(lastSyncAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</>}
            </div>
          </div>
        </div>
        <span className="pill bg-good-wash text-good"><Wifi className="mr-1 h-3 w-3" /> Aktif</span>
      </div>

      <p className="mt-4 text-sm text-ink-2">
        Tartı yalnızca <b className="text-ink">ağırlık</b> ve <b className="text-ink">biyo-impedans</b> ölçer; vücut yağı, kas, su ve BMR bunlardan hesaplanır (Xiaomi algoritması yaklaşımı).
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={simulate} disabled={busy !== null}>
          {busy === "sim" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Ölçümü simüle et
        </button>
        <button className="btn" onClick={connectBle} disabled={busy !== null}>
          {busy === "ble" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bluetooth className="h-4 w-4" />}
          {busy === "ble" ? "Ölçüm bekleniyor…" : "Bluetooth ile bağlan"}
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Simülatör POC için gerçekçi bir ölçüm üretir. “Bluetooth ile bağlan” gerçek tartıyı destekleyen tarayıcılarda (Chrome/Edge, masaüstü/Android) çalışır.
      </p>

      {error && <div className="mt-3 rounded-lg bg-crit-wash px-3 py-2 text-sm text-crit">{error}</div>}

      {result && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary-wash/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary-ink">
            <CheckCircle2 className="h-4 w-4" /> Yeni ölçüm alındı
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            <Cell label="Ağırlık" value={fmt(result.weightKg, 1)} unit="kg" />
            <Cell label="Vücut yağı" value={fmt(result.bodyFatPct, 1)} unit="%" />
            <Cell label="Kas" value={fmt(result.skeletalMuscleKg, 1)} unit="kg" />
            <Cell label="Su" value={fmt(result.bodyWaterPct, 1)} unit="%" />
            <Cell label="Viseral" value={fmt(result.visceralFat)} unit="" />
            <Cell label="BMR" value={fmt(result.bmr)} unit="kcal" />
            <Cell label="İmpedans" value={fmt(result.impedance)} unit="Ω" />
            <Cell label="Kemik" value={fmt(result.boneMassKg, 1)} unit="kg" />
          </div>
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <div className="text-[0.7rem] text-ink-3">{label}</div>
      <div className="text-base font-semibold tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-xs font-normal text-ink-3">{unit}</span>}
      </div>
    </div>
  );
}
