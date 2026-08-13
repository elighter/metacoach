"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, ScanLine, Loader2, CheckCircle2, ArrowLeft, AlertTriangle, Sparkles } from "lucide-react";
import { cn, fmt } from "@/lib/utils";

type Kind = "lab_pdf" | "inbody_img";
type Stage = "idle" | "parsing" | "review" | "saving" | "done" | "error";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

interface Biomarker {
  code: string; name: string; value: number; unit: string;
  refLow: number | null; refHigh: number | null;
  flag: "low" | "normal" | "high"; confidence: number;
}

const flagPill: Record<string, string> = {
  normal: "bg-good-wash text-good", high: "bg-crit-wash text-crit", low: "bg-warn-wash text-warn",
};
const flagText: Record<string, string> = { normal: "Normal", high: "Yüksek", low: "Düşük" };

export default function UploadPage() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("lab_pdf");
  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState("");
  const [fileId, setFileId] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [provider, setProvider] = useState<"mock" | "claude">("mock");
  const [errorMsg, setErrorMsg] = useState("");
  const [lab, setLab] = useState<{ panelName: string; labName: string; collectedAt: string; biomarkers: Biomarker[] } | null>(null);
  const [inbody, setInbody] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function validate(file: File): string | null {
    if (file.size > MAX_BYTES) return `Dosya çok büyük (${fmt(file.size / 1024 / 1024, 1)} MB). En fazla 10 MB.`;
    if (file.size === 0) return "Dosya boş görünüyor.";
    if (kind === "lab_pdf" && file.type && file.type !== "application/pdf")
      return "Kan tahlili için PDF bekleniyor. InBody görseli için sekmeyi değiştirin.";
    if (kind === "inbody_img" && file.type && !file.type.startsWith("image/"))
      return "InBody için görsel (JPG/PNG) bekleniyor. PDF için sekmeyi değiştirin.";
    return null;
  }

  async function handleFile(file: File) {
    const invalid = validate(file);
    if (invalid) {
      setFileName(file.name);
      setErrorMsg(invalid);
      setStage("error");
      return;
    }
    setFileName(file.name);
    setStage("parsing");
    try {
      const b64 = await readAsBase64(file); // sent to the real Claude parser; mock ignores it
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, fileName: file.name, size: file.size, mime: file.type, data: b64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Belge okunamadı. Lütfen tekrar deneyin.");

      setFileId(data.fileId);
      setProvider(data.provider ?? "mock");
      setConfidence(data.parsed.confidence ?? 0.95);
      if (kind === "lab_pdf") {
        setLab({
          panelName: data.parsed.panelName,
          labName: data.parsed.labName,
          collectedAt: data.parsed.collectedAt?.slice(0, 10) ?? "",
          biomarkers: data.parsed.biomarkers,
        });
      } else {
        setInbody(data.parsed);
      }
      setStage("review");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Beklenmeyen bir hata oluştu.");
      setStage("error");
    }
  }

  async function confirm() {
    setStage("saving");
    const body =
      kind === "lab_pdf"
        ? { kind, fileId, panelName: lab!.panelName, labName: lab!.labName, collectedAt: lab!.collectedAt ? new Date(lab!.collectedAt).toISOString() : undefined, biomarkers: lab!.biomarkers }
        : { kind, fileId, ...inbody };
    await fetch("/api/ingest/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setStage("done");
    router.refresh();
  }

  function reset() {
    setStage("idle"); setLab(null); setInbody(null); setFileName(""); setErrorMsg("");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Yükle &amp; AI ile Oku</h1>
      <p className="mt-1 text-sm text-ink-3">
        Kan tahlili PDF'ini veya InBody görselini yükle; değerler AI ile okunur, sen onaylarsın.
      </p>

      {stage === "idle" && (
        <>
          <div className="mt-5 inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
            {([["lab_pdf", "Kan Tahlili (PDF)", FileText], ["inbody_img", "InBody (Görsel)", ScanLine]] as const).map(
              ([k, label, Icon]) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
                    kind === k ? "bg-surface text-primary-ink shadow-card" : "text-ink-3 hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ),
            )}
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition-colors",
              dragOver ? "border-primary bg-primary-wash" : "border-border-strong bg-surface hover:bg-surface-2",
            )}
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-wash text-primary-ink">
              <UploadCloud className="h-7 w-7" />
            </span>
            <div>
              <div className="font-semibold">Dosyayı buraya sürükle ya da tıkla</div>
              <div className="text-sm text-ink-3">
                {kind === "lab_pdf" ? "PDF, en fazla 10 MB" : "JPG / PNG, en fazla 10 MB"}
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={kind === "lab_pdf" ? "application/pdf" : "image/*"}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
          <p className="mt-3 text-center text-xs text-ink-3">
            🔒 Sağlık verisi özel nitelikli kişisel veridir. Dosyalar şifreli depolanır; istediğin an silebilirsin.
          </p>
        </>
      )}

      {stage === "parsing" && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="font-semibold">AI okuyor…</div>
          <div className="text-sm text-ink-3">{fileName} · OCR + görü modeli değerleri çıkarıyor</div>
        </div>
      )}

      {stage === "review" && lab && (
        <div className="mt-6">
          <ReviewHeader confidence={confidence} provider={provider} onBack={reset} />
          <div className="card mt-3 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Panel" value={lab.panelName} onChange={(v) => setLab({ ...lab, panelName: v })} />
              <Field label="Laboratuvar" value={lab.labName} onChange={(v) => setLab({ ...lab, labName: v })} />
              <Field label="Alım tarihi" type="date" value={lab.collectedAt} onChange={(v) => setLab({ ...lab, collectedAt: v })} />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left font-mono text-[0.66rem] uppercase tracking-wider text-ink-3">
                    <th className="py-2">Biyobelirteç</th><th>Değer</th><th>Birim</th><th>Durum</th><th className="text-right">Güven</th>
                  </tr>
                </thead>
                <tbody>
                  {lab.biomarkers.map((b, i) => (
                    <tr key={b.code} className="border-b border-border last:border-0">
                      <td className="py-2 font-medium">{b.name}</td>
                      <td>
                        <input
                          type="number" step="0.1" value={b.value}
                          onChange={(e) => {
                            const copy = [...lab.biomarkers];
                            copy[i] = { ...b, value: Number(e.target.value) };
                            setLab({ ...lab, biomarkers: copy });
                          }}
                          className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm tabular-nums outline-none focus:border-primary"
                        />
                      </td>
                      <td className="text-ink-3">{b.unit}</td>
                      <td><span className={cn("pill", flagPill[b.flag])}>{flagText[b.flag]}</span></td>
                      <td className="text-right font-mono text-xs text-ink-3">%{Math.round(b.confidence * 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <ConfirmBar onConfirm={confirm} />
        </div>
      )}

      {stage === "review" && inbody && (
        <div className="mt-6">
          <ReviewHeader confidence={confidence} provider={provider} onBack={reset} />
          <div className="card mt-3 grid gap-3 p-4 sm:grid-cols-3">
            <Field label="Ağırlık (kg)" type="number" value={String(inbody.weightKg)} onChange={(v) => setInbody({ ...inbody, weightKg: Number(v) })} />
            <Field label="Vücut yağı (%)" type="number" value={String(inbody.bodyFatPct)} onChange={(v) => setInbody({ ...inbody, bodyFatPct: Number(v) })} />
            <Field label="Kas kütlesi (kg)" type="number" value={String(inbody.skeletalMuscleKg)} onChange={(v) => setInbody({ ...inbody, skeletalMuscleKg: Number(v) })} />
            <Field label="Vücut suyu (%)" type="number" value={String(inbody.bodyWaterPct)} onChange={(v) => setInbody({ ...inbody, bodyWaterPct: Number(v) })} />
            <Field label="Viseral yağ" type="number" value={String(inbody.visceralFat)} onChange={(v) => setInbody({ ...inbody, visceralFat: Number(v) })} />
            <Field label="BMR (kcal)" type="number" value={String(inbody.bmrDevice)} onChange={(v) => setInbody({ ...inbody, bmrDevice: Number(v) })} />
          </div>
          <ConfirmBar onConfirm={confirm} />
        </div>
      )}

      {stage === "saving" && (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-10 text-ink-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Kaydediliyor…
        </div>
      )}

      {stage === "error" && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-crit/30 bg-crit-wash/40 p-12 text-center">
          <AlertTriangle className="h-10 w-10 text-crit" />
          <div className="text-lg font-semibold">Okuma başarısız</div>
          <p className="max-w-md text-sm text-ink-2">{errorMsg}</p>
          {fileName && <p className="font-mono text-xs text-ink-3">{fileName}</p>}
          <div className="mt-2 flex gap-2">
            <button className="btn btn-primary" onClick={reset}>Tekrar dene</button>
          </div>
        </div>
      )}

      {stage === "done" && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-good" />
          <div className="text-lg font-semibold">Kaydedildi ✓</div>
          <p className="text-sm text-ink-3">Değerler profiline işlendi ve dashboard güncellendi.</p>
          <div className="mt-2 flex gap-2">
            <button className="btn" onClick={reset}>Başka dosya yükle</button>
            <button className="btn btn-primary" onClick={() => router.push("/")}>Dashboard'a git</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewHeader({ confidence, provider, onBack }: { confidence: number; provider: "mock" | "claude"; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button className="btn btn-ghost h-8" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Geri</button>
      <div className="flex items-center gap-2">
        <span
          className={cn("pill", provider === "claude" ? "bg-primary-wash text-primary-ink" : "bg-surface-2 text-ink-3")}
          title={provider === "claude" ? "Claude Vision ile okundu" : "Örnek (mock) veri — gerçek AI için ANTHROPIC_API_KEY gerekir"}
        >
          <Sparkles className="mr-1 h-3 w-3" />
          {provider === "claude" ? "Claude Vision" : "Örnek veri (mock)"}
        </span>
        <span className="pill bg-primary-wash text-primary-ink">Genel güven %{Math.round(confidence * 100)}</span>
      </div>
    </div>
  );
}

function ConfirmBar({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-surface-2 p-3">
      <p className="text-xs text-ink-3">Değerleri kontrol et; gerekirse düzelt. Onayınca profiline kaydedilir.</p>
      <button className="btn btn-primary shrink-0" onClick={onConfirm}><CheckCircle2 className="h-4 w-4" /> Onayla &amp; Kaydet</button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="input" />
    </label>
  );
}
