"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Check, Sun, Moon, Monitor, Bluetooth, Heart, Download, Trash2, ShieldCheck } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { PushControls } from "@/components/push-controls";
import { cn } from "@/lib/utils";

interface SettingsData {
  notifyWeighIn: boolean;
  notifyMeals: boolean;
  weeklyReport: boolean;
  tdeeWindowDays: number;
}
interface Device { provider: string; status: string; lastSyncAt: string | null }
interface ConsentItem { type: string; version: string; grantedAt: string }

const deviceMeta: Record<string, { label: string; icon: any }> = {
  mi_scale: { label: "Mi Body Composition Scale 2", icon: Bluetooth },
  apple_health: { label: "Apple Health", icon: Heart },
  garmin: { label: "Garmin", icon: Heart },
};
const consentLabel: Record<string, string> = {
  kvkk: "KVKK Aydınlatma & Açık Rıza",
  health_data: "Sağlık Verisi İşleme Rızası",
  gdpr: "GDPR",
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn("relative h-6 w-11 rounded-full transition-colors", on ? "bg-primary" : "bg-surface-3")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function SettingsForm({
  initial,
  devices,
  consents,
}: {
  initial: SettingsData;
  devices: Device[];
  consents: ConsentItem[];
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  function set<K extends keyof SettingsData>(k: K, v: SettingsData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setState("idle");
  }
  async function save() {
    setState("saving");
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setState("saved");
    router.refresh();
  }

  const themeOpts = [
    ["light", "Aydınlık", Sun],
    ["system", "Sistem", Monitor],
    ["dark", "Karanlık", Moon],
  ] as const;

  return (
    <div className="flex flex-col gap-5">
      {/* Appearance */}
      <Section title="Görünüm">
        <div className="flex items-center justify-between">
          <div className="text-sm">Tema</div>
          <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
            {themeOpts.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium", theme === id ? "bg-surface text-primary-ink shadow-card" : "text-ink-3 hover:text-ink")}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Bildirimler">
        <Rowt label="Tartılma hatırlatıcısı" desc="Her sabah trend ölçümü için">
          <Toggle on={form.notifyWeighIn} onChange={(v) => set("notifyWeighIn", v)} />
        </Rowt>
        <Rowt label="Öğün kaydı hatırlatıcısı" desc="Öğün eklemeyi unutma">
          <Toggle on={form.notifyMeals} onChange={(v) => set("notifyMeals", v)} />
        </Rowt>
        <Rowt label="Haftalık rapor" desc="TDEE ve ilerleme özeti">
          <Toggle on={form.weeklyReport} onChange={(v) => set("weeklyReport", v)} />
        </Rowt>
        <div className="border-t border-border pt-3">
          <div className="mb-2 text-sm font-medium">Push bildirimleri</div>
          <PushControls />
        </div>
      </Section>

      {/* Metabolism */}
      <Section title="Metabolizma">
        <Rowt label="TDEE hesap penceresi" desc="Daha uzun = daha stabil, daha kısa = daha hızlı tepki">
          <select className="input w-28" value={form.tdeeWindowDays} onChange={(e) => set("tdeeWindowDays", Number(e.target.value))}>
            <option value={14}>14 gün</option>
            <option value={21}>21 gün</option>
            <option value={28}>28 gün</option>
          </select>
        </Rowt>
      </Section>

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" onClick={save} disabled={state === "saving"}>
          {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "saved" ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {state === "saved" ? "Kaydedildi" : "Ayarları kaydet"}
        </button>
      </div>

      {/* Devices */}
      <Section title="Bağlı cihazlar">
        {devices.map((d) => {
          const meta = deviceMeta[d.provider] ?? { label: d.provider, icon: Heart };
          return (
            <div key={d.provider} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-ink-2"><meta.icon className="h-4 w-4" /></span>
                <div>
                  <div className="text-sm font-medium">{meta.label}</div>
                  <div className="text-xs text-ink-3">{d.status === "connected" ? "Bağlı" : "Bağlı değil"}</div>
                </div>
              </div>
              <span className="pill bg-good-wash text-good">Aktif</span>
            </div>
          );
        })}
      </Section>

      {/* Privacy / KVKK */}
      <Section title="Veri & Gizlilik (KVKK)">
        <div className="mb-3 flex flex-col gap-1.5">
          {consents.map((c) => (
            <div key={c.type} className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-good" />
              <span className="text-ink-2">{consentLabel[c.type] ?? c.type}</span>
              <span className="ml-auto font-mono text-xs text-ink-3">v{c.version}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => alert("KVKK: Verilerini dışa aktarma talebin alındı. Üretimde JSON/PDF olarak e-postana gönderilir.")}>
            <Download className="h-4 w-4" /> Verilerimi dışa aktar
          </button>
          <button className="btn border-crit/30 text-crit hover:bg-crit-wash" onClick={() => alert("Hesap silme geri alınamaz bir işlemdir. POC'de devre dışı; üretimde çift onay + kalıcı silme akışıyla yapılır.")}>
            <Trash2 className="h-4 w-4" /> Hesabımı sil
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="kicker mb-3">{title}</div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}
function Rowt({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-ink-3">{desc}</div>
      </div>
      {children}
    </div>
  );
}
