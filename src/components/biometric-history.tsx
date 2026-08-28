"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { fmt, fmtDate } from "@/lib/utils";

interface Bio {
  id: string;
  measuredAt: string;
  source: string;
  weightKg: number;
  bodyFatPct: number | null;
  skeletalMuscleKg: number | null;
  bodyWaterPct: number | null;
  visceralFat: number | null;
}

const sourceLabel: Record<string, string> = {
  mi_scale: "Mi Scale 2",
  inbody: "InBody",
  manual: "Manuel",
  wearable: "Giyilebilir",
};

export function BiometricHistory({ bios }: { bios: Bio[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (confirm !== id) {
      setConfirm(id);
      return;
    }
    setDeleting(id);
    try {
      const res = await fetch(`/api/biometric/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeleting(null);
      setConfirm(null);
    }
  }

  return (
    <div className="card mt-5 p-4">
      <div className="mb-2 text-[0.95rem] font-semibold">Ölçüm geçmişi</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[0.66rem] uppercase tracking-wider text-ink-3">
              <th className="py-2">Tarih</th>
              <th>Kaynak</th>
              <th className="text-right">Ağırlık</th>
              <th className="text-right">Yağ %</th>
              <th className="text-right">Kas</th>
              <th className="text-right">Su %</th>
              <th className="text-right">Viseral</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {bios.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0 group">
                <td className="py-2.5">
                  {fmtDate(b.measuredAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td>
                  <span className="pill bg-surface-2 text-ink-2">
                    {sourceLabel[b.source] ?? b.source}
                  </span>
                </td>
                <td className="text-right font-medium">{fmt(b.weightKg, 1)} kg</td>
                <td className="text-right">{b.bodyFatPct != null ? fmt(b.bodyFatPct, 1) : "—"}</td>
                <td className="text-right">
                  {b.skeletalMuscleKg != null ? `${fmt(b.skeletalMuscleKg, 1)} kg` : "—"}
                </td>
                <td className="text-right">{b.bodyWaterPct != null ? fmt(b.bodyWaterPct, 1) : "—"}</td>
                <td className="text-right">{b.visceralFat != null ? fmt(b.visceralFat) : "—"}</td>
                <td className="text-right">
                  <button
                    onClick={() => handleDelete(b.id)}
                    disabled={deleting === b.id}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                      confirm === b.id
                        ? "bg-crit-wash text-crit"
                        : "text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-surface-2 hover:text-crit"
                    }`}
                    title={confirm === b.id ? "Silmeyi onayla" : "Ölçümü sil"}
                  >
                    {deleting === b.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
            {bios.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-ink-3">
                  Henüz ölçüm yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
