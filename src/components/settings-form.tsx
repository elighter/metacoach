"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Check, Sun, Moon, Monitor, Bluetooth, Heart, Download, Trash2, ShieldCheck, Activity, Copy, RefreshCw, Upload } from "lucide-react";
import { fmtDate } from "@/lib/utils";
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
interface AppleHealth { token: string | null; lastSyncAt: string | null }

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
  appleHealth,
}: {
  initial: SettingsData;
  devices: Device[];
  consents: ConsentItem[];
  appleHealth: AppleHealth;
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

      {/* Apple Health / activity sync */}
      <AppleHealthCard appleHealth={appleHealth} />

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

function AppleHealthCard({ appleHealth }: { appleHealth: AppleHealth }) {
  const [token, setToken] = useState(appleHealth.token);
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"url" | "token" | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const webhookUrl = origin ? `${origin}/api/ingest/health` : "/api/ingest/health";

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/settings/health-token", { method: "POST" });
      if (res.ok) setToken((await res.json()).token);
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, which: "url" | "token") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* pano erişimi yoksa sessiz geç */
    }
  }

  return (
    <div className="card p-5">
      <div className="kicker mb-3">Apple Health & Aktivite</div>
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-wash text-primary-ink">
          <Activity className="h-[18px] w-[18px]" />
        </span>
        <p className="text-sm text-ink-3">
          Apple Watch ve Technogym verini otomatik akıt. iPhone Sağlık → aktif kalori, adım ve
          antrenmanlar, aşağıdaki adrese periyodik gönderilir. Aktivite düzeyin otomatik kalibre
          edilir; elle antrenman girmene gerek kalmaz.
        </p>
      </div>

      {!token ? (
        <button className="btn btn-primary" onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
          Aktivite senkronunu etkinleştir
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <Field label="Webhook adresi" value={webhookUrl} onCopy={() => copy(webhookUrl, "url")} copied={copied === "url"} />
          <Field label="Token (gizli)" value={token} mono onCopy={() => copy(token, "token")} copied={copied === "token"} />

          <div className="rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-ink-2">
            <div className="mb-1 font-semibold text-ink">Kurulum (Health Auto Export)</div>
            <ol className="ml-4 list-decimal space-y-0.5">
              <li>App Store'dan <b>Health Auto Export – JSON+CSV</b> kur.</li>
              <li><b>Automations → REST API</b> ekle; URL'ye webhook adresini yapıştır.</li>
              <li>Header ekle: <span className="font-mono">Authorization: Bearer &lt;token&gt;</span></li>
              <li>Metrikler: <b>Active Energy, Basal Energy Burned, Step Count, Workouts</b>. Aggregation: <b>Daily</b>, format <b>JSON</b>.</li>
              <li>Otomasyonu günlük çalışacak şekilde kaydet.</li>
            </ol>
            <div className="mt-2 text-ink-3">Alternatif: Apple Kısayol ile aynı adrese POST eden bir otomasyon da kullanılabilir.</div>
          </div>

          <ManualSyncUpload />

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn" onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Token'ı yenile
            </button>
            <span className="text-xs text-ink-3">
              {appleHealth.lastSyncAt
                ? `Son senkron: ${fmtDate(appleHealth.lastSyncAt, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`
                : "Henüz veri alınmadı."}
            </span>
          </div>
          <p className="text-xs text-ink-3">
            Token'ı gizli tut; yenilersen eski kurulum çalışmayı durdurur ve adresi güncellemen gerekir.
          </p>
        </div>
      )}
    </div>
  );
}

function ManualSyncUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setResult(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await fetch("/api/ingest/health/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          ok: true,
          msg: `${data.daysWritten} gün + ${data.workoutsCreated} antrenman aktarıldı, ${data.sessionsCompleted} seans tamamlandı.`,
        });
        router.refresh();
      } else {
        setResult({ ok: false, msg: data.error ?? "İçe aktarma başarısız." });
      }
    } catch {
      setResult({ ok: false, msg: "Dosya okunamadı veya geçersiz JSON." });
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="rounded-lg border-2 border-dashed border-border p-4 text-center transition-colors hover:border-primary/40"
    >
      <div className="mb-2 text-sm font-medium text-ink-2">Manuel içe aktarma</div>
      <p className="mb-3 text-xs text-ink-3">
        Health Auto Export JSON dosyasını sürükle-bırak veya dosya seç. Otomasyon çalışmadığında ya da geçmiş verini yüklemek istediğinde kullan.
      </p>
      <label className="btn btn-primary cursor-pointer inline-flex">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? "Aktarılıyor…" : "JSON dosyası seç"}
        <input type="file" accept=".json,application/json" className="hidden" onChange={onFileInput} disabled={busy} />
      </label>
      {result && (
        <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${result.ok ? "bg-good-wash text-good" : "bg-crit-wash text-crit"}`}>
          {result.msg}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono, onCopy, copied }: { label: string; value: string; mono?: boolean; onCopy: () => void; copied: boolean }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="flex gap-2">
        <input readOnly value={value} className={cn("input", mono && "font-mono text-xs")} onFocus={(e) => e.currentTarget.select()} />
        <button className="btn shrink-0 px-3" onClick={onCopy} aria-label="Kopyala">
          {copied ? <Check className="h-4 w-4 text-good" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </label>
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
